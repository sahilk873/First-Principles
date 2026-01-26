'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { Review, ReviewStatus, RationaleFactor } from '@/types/database';
import { getCaseHasDecompressionPlusFusion, getCaseHasFusion, LIKERT_MIN, LIKERT_MAX } from '@/lib/utils/review';
import { computeCaseAggregate, type ReviewForAggregation } from '@/lib/utils/aggregation';
import { createSecondaryReview } from '@/lib/actions/secondary-review';

type ReviewQueryResult = Pick<Review, 'id' | 'reviewer_id' | 'status' | 'case_id'>;

/** Phase 1: Full form data for the 5-step reviewer workflow. */
export interface ReviewFormData {
  // Step 1
  sufficient_info: boolean | null;
  info_deficiencies: string | null;
  more_than_necessary: boolean | null;
  info_burden_items: string | null;
  // Step 2
  agree_justification: boolean | null;
  justification_comment: string | null;
  // Step 3 – overall
  agree_overall_plan_acceptable: boolean | null;
  would_personally_prescribe: boolean | null;
  preferred_procedure_text: string | null;
  agree_need_any_surgery_now: boolean | null;
  benefit_from_more_nonsurgical_first: boolean | null;
  proposed_nonsurgical_therapies_text: string | null;
  // Step 3 – decompression (when case has decomp+fusion)
  agree_decompression_plan_acceptable: boolean | null;
  agree_need_any_decompression_now: boolean | null;
  suggested_decompression_text: string | null;
  // Step 3 – fusion (when case has fusion)
  agree_fusion_plan_acceptable: boolean | null;
  agree_need_any_fusion_now: boolean | null;
  suggested_fusion_text: string | null;
  // Step 4
  appropriateness_score: number | null;
  necessity_score: number | null;
  // Step 5
  rationale_factors: RationaleFactor[] | null;
  rationale_other_text: string | null;
  final_comments: string | null;
}

/** Build DB update payload from form (only defined keys). */
function toPhase1UpdatePayload(formData: Partial<ReviewFormData>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys: (keyof ReviewFormData)[] = [
    'sufficient_info', 'info_deficiencies', 'more_than_necessary', 'info_burden_items',
    'agree_justification', 'justification_comment',
    'agree_overall_plan_acceptable', 'would_personally_prescribe', 'preferred_procedure_text',
    'agree_need_any_surgery_now', 'benefit_from_more_nonsurgical_first', 'proposed_nonsurgical_therapies_text',
    'agree_decompression_plan_acceptable', 'agree_need_any_decompression_now', 'suggested_decompression_text',
    'agree_fusion_plan_acceptable', 'agree_need_any_fusion_now', 'suggested_fusion_text',
    'appropriateness_score', 'necessity_score',
    'rationale_factors', 'rationale_other_text', 'final_comments',
  ];
  for (const k of keys) {
    if (formData[k] !== undefined) out[k] = formData[k];
  }
  return out;
}

function validateFullReview(
  form: ReviewFormData,
  opts: { caseHasDecompressionPlusFusion: boolean; caseHasFusion: boolean }
): { ok: boolean; error?: string } {
  const { caseHasDecompressionPlusFusion, caseHasFusion } = opts;

  // Step 1
  if (form.sufficient_info !== true) return { ok: false, error: 'Data sufficiency: you must indicate that information is sufficient to continue, or submit as stopped.' };
  if (form.more_than_necessary == null) return { ok: false, error: 'Please indicate if more than necessary information was provided.' };
  if (form.more_than_necessary === true && !(form.info_burden_items?.trim())) return { ok: false, error: 'Please describe the unnecessary information burden.' };

  // Step 2
  if (form.agree_justification == null) return { ok: false, error: 'Please indicate whether you agree with the clinical justification.' };
  if (form.agree_justification === false && !(form.justification_comment?.trim())) return { ok: false, error: 'Please provide a comment when you disagree with the justification.' };

  // Step 3 – overall
  if (form.agree_overall_plan_acceptable == null) return { ok: false, error: 'Please indicate whether the overall surgical plan is acceptable.' };

  if (form.agree_overall_plan_acceptable === true) {
    if (form.would_personally_prescribe == null) return { ok: false, error: 'Please indicate whether you would personally prescribe this plan.' };
    if (form.would_personally_prescribe === false && !(form.preferred_procedure_text?.trim())) return { ok: false, error: 'Please describe your preferred procedure.' };
  } else {
    if (form.agree_need_any_surgery_now == null) return { ok: false, error: 'Please indicate whether any surgery is needed now.' };
    if (form.agree_need_any_surgery_now === false) {
      if (form.benefit_from_more_nonsurgical_first == null) return { ok: false, error: 'Please indicate if the patient would benefit from more nonsurgical care first.' };
      if (form.benefit_from_more_nonsurgical_first === true && !(form.proposed_nonsurgical_therapies_text?.trim())) return { ok: false, error: 'Please describe proposed nonsurgical therapies.' };
    }
  }

  // Step 3 – decompression (only when case has decomp+fusion)
  if (caseHasDecompressionPlusFusion) {
    if (form.agree_decompression_plan_acceptable == null) return { ok: false, error: 'Please indicate whether the decompression plan is acceptable.' };
    if (form.agree_decompression_plan_acceptable === false) {
      if (form.agree_need_any_decompression_now == null) return { ok: false, error: 'Please indicate whether any decompression is needed now.' };
      if (form.agree_need_any_decompression_now === true && !(form.suggested_decompression_text?.trim())) return { ok: false, error: 'Please provide suggested decompression.' };
    }
  }

  // Step 3 – fusion (when case has fusion)
  if (caseHasFusion) {
    if (form.agree_fusion_plan_acceptable == null) return { ok: false, error: 'Please indicate whether the fusion plan is acceptable.' };
    if (form.agree_fusion_plan_acceptable === false) {
      if (form.agree_need_any_fusion_now == null) return { ok: false, error: 'Please indicate whether any fusion is needed now.' };
      if (form.agree_need_any_fusion_now === true && !(form.suggested_fusion_text?.trim())) return { ok: false, error: 'Please provide suggested fusion.' };
    }
  }

  // Step 4
  const a = form.appropriateness_score;
  if (a == null || typeof a !== 'number' || a < LIKERT_MIN || a > LIKERT_MAX) return { ok: false, error: 'Appropriateness score (1–9) is required.' };
  if (a >= 7) {
    const n = form.necessity_score;
    if (n == null || typeof n !== 'number' || n < LIKERT_MIN || n > LIKERT_MAX) return { ok: false, error: 'Necessity score (1–9) is required when appropriateness is 7–9.' };
  } else if (form.necessity_score != null) {
    return { ok: false, error: 'Necessity should be left blank when appropriateness is 1–6.' };
  }

  // Step 5
  const factors = form.rationale_factors ?? [];
  if (factors.includes('OTHER') && !(form.rationale_other_text?.trim())) return { ok: false, error: 'Please specify what you mean by "Other" in rationale factors.' };

  return { ok: true };
}

export async function startReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: r, error: e } = await supabase
    .from('reviews')
    .select('id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (e || !r) return { success: false, error: 'Review not found' };
  const row = r as ReviewQueryResult;
  if (row.reviewer_id !== user.id) return { success: false, error: 'Not authorized' };
  if (row.status !== 'ASSIGNED') return { success: true }; // no-op if already started

  const { error: up } = await supabase
    .from('reviews')
    .update({ status: 'IN_PROGRESS' } as never)
    .eq('id', reviewId);

  if (up) return { success: false, error: up.message };
  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);
  return { success: true };
}

export async function saveReviewDraft(
  reviewId: string,
  formData: Partial<ReviewFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: r, error: e } = await supabase
    .from('reviews')
    .select('id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (e || !r) return { success: false, error: 'Review not found' };
  const row = r as ReviewQueryResult;
  if (row.reviewer_id !== user.id) return { success: false, error: 'Not authorized' };
  if (row.status !== 'ASSIGNED' && row.status !== 'IN_PROGRESS') return { success: false, error: 'Cannot modify this review' };

  const update = toPhase1UpdatePayload(formData);
  if (Object.keys(update).length === 0) return { success: true };

  const { error: up } = await supabase.from('reviews').update(update as never).eq('id', reviewId);
  if (up) return { success: false, error: up.message };
  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);
  return { success: true };
}

export async function submitStoppedInsufficientData(
  reviewId: string,
  data: { sufficient_info: false; info_deficiencies: string }
): Promise<{ success: boolean; error?: string }> {
  if (data.sufficient_info !== false) return { success: false, error: 'Stopped reviews require sufficient_info=false.' };
  if (!(data.info_deficiencies?.trim())) return { success: false, error: 'Please describe the information deficiencies.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: r, error: e } = await supabase
    .from('reviews')
    .select('id, case_id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (e || !r) return { success: false, error: 'Review not found' };
  const row = r as ReviewQueryResult;
  if (row.reviewer_id !== user.id) return { success: false, error: 'Not authorized' };
  if (row.status !== 'ASSIGNED' && row.status !== 'IN_PROGRESS') return { success: false, error: 'Cannot modify this review' };

  const { error: up } = await supabase
    .from('reviews')
    .update({
      sufficient_info: false,
      info_deficiencies: data.info_deficiencies.trim(),
      status: 'STOPPED_INSUFFICIENT_DATA' as ReviewStatus,
    } as never)
    .eq('id', reviewId);

  if (up) return { success: false, error: up.message };

  const { data: profile } = await supabase.from('profiles').select('id, org_id').eq('id', user.id).single();
  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    org_id: (profile as { org_id: string } | null)?.org_id,
    action_type: 'REVIEW_STOPPED_INSUFFICIENT_DATA',
    target_type: 'REVIEW',
    target_id: reviewId,
    metadata: { case_id: row.case_id },
  } as never);

  await computeAndUpsertCaseAggregate(row.case_id);

  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/cases/${row.case_id}`);
  return { success: true };
}

export async function submitReview(
  reviewId: string,
  formData: ReviewFormData,
  opts: { caseHasDecompressionPlusFusion: boolean; caseHasFusion: boolean }
): Promise<{ success: boolean; error?: string }> {
  const v = validateFullReview(formData, opts);
  if (!v.ok) return { success: false, error: v.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: r, error: e } = await supabase
    .from('reviews')
    .select('id, case_id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (e || !r) return { success: false, error: 'Review not found' };
  const row = r as ReviewQueryResult;
  if (row.reviewer_id !== user.id) return { success: false, error: 'Not authorized' };
  if (row.status !== 'ASSIGNED' && row.status !== 'IN_PROGRESS') return { success: false, error: 'Review cannot be submitted' };

  const a = formData.appropriateness_score!;
  const necessity = a >= 7 ? formData.necessity_score : null;

  const payload: Record<string, unknown> = {
    ...toPhase1UpdatePayload(formData),
    necessity_score: necessity,
    status: 'SUBMITTED' as ReviewStatus,
    // Backward compat for clarify/result pages
    surgery_indicated: formData.agree_overall_plan_acceptable === true
      ? true
      : formData.agree_overall_plan_acceptable === false
        ? formData.agree_need_any_surgery_now === true
        : null,
    fusion_indicated: opts.caseHasFusion
      ? formData.agree_fusion_plan_acceptable === true
        ? true
        : formData.agree_fusion_plan_acceptable === false
          ? formData.agree_need_any_fusion_now === true
          : null
      : null,
  };

  const { error: up } = await supabase.from('reviews').update(payload as never).eq('id', reviewId);
  if (up) return { success: false, error: up.message };

  const { data: profile } = await supabase.from('profiles').select('id, org_id').eq('id', user.id).single();
  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    org_id: (profile as { org_id: string } | null)?.org_id,
    action_type: 'REVIEW_SUBMITTED',
    target_type: 'REVIEW',
    target_id: reviewId,
    metadata: { case_id: row.case_id },
  } as never);

  await computeAndUpsertCaseAggregate(row.case_id);

  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/cases/${row.case_id}`);
  return { success: true };
}

// ============================================
// PHASE 2: DATA AGGREGATION + SCORING
// ============================================

const PHASE2_REVIEW_SELECT = `
  id, status, info_deficiencies,
  agree_justification, agree_overall_plan_acceptable, would_personally_prescribe,
  agree_need_any_surgery_now, benefit_from_more_nonsurgical_first,
  agree_decompression_plan_acceptable, agree_need_any_decompression_now,
  agree_fusion_plan_acceptable, agree_need_any_fusion_now,
  appropriateness_score, necessity_score
`;

/**
 * Phase 2: Fetch reviews + case, run computeCaseAggregate, upsert case_aggregates.
 * When SCORED_PRIMARY and not secondary_review_triggered: also insert case_results (if missing),
 * set case to COMPLETED, and notify. Otherwise case stays UNDER_REVIEW.
 */
export async function computeAndUpsertCaseAggregate(caseId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('clinical_data, proposed_procedure_codes')
    .eq('id', caseId)
    .single();

  if (caseErr || !caseData) {
    return { success: true }; // case not found; no-op
  }

  type CaseSelect = { clinical_data: unknown; proposed_procedure_codes: string[] | null };
  const caseRow = caseData as CaseSelect;
  const caseLike = {
    clinical_data: caseRow.clinical_data,
    proposed_procedure_codes: caseRow.proposed_procedure_codes || [],
  };
  const caseHasDecompressionPlusFusion = getCaseHasDecompressionPlusFusion(caseLike);
  const caseHasFusion = getCaseHasFusion(caseLike);

  const { data: revRaw, error: revErr } = await supabase
    .from('reviews')
    .select(PHASE2_REVIEW_SELECT)
    .eq('case_id', caseId);

  if (revErr) {
    console.error('computeAndUpsertCaseAggregate: fetch reviews', revErr);
    return { success: false, error: 'Failed to fetch reviews' };
  }
  const reviews = (revRaw as ReviewForAggregation[] | null) || [];

  // If any review is STOPPED_INSUFFICIENT_DATA, we need more info
  const stopped = reviews.filter((r) => r.status === 'STOPPED_INSUFFICIENT_DATA');
  const nStoppedInsufficient = stopped.length;
  if (nStoppedInsufficient > 0) {
    const { error: caseUpErr } = await supabase
      .from('cases')
      .update({ status: 'NEEDS_MORE_INFO' } as never)
      .eq('id', caseId);
    if (caseUpErr) {
      console.error('computeAndUpsertCaseAggregate: update case status', caseUpErr);
    }
  }

  const out = computeCaseAggregate({
    caseId,
    reviews,
    caseHasDecompressionPlusFusion,
    caseHasFusion,
  });

  const { error: ue } = await supabase.from('case_aggregates').upsert(
    {
      case_id: caseId,
      n_assigned: out.n_assigned,
      n_valid: out.n_valid,
      n_stopped_insufficient: out.n_stopped_insufficient,
      aggregation_status: out.aggregation_status,
      missing_items: out.missing_items,
      binary_results: out.binary_results,
      appropriateness_mean: out.appropriateness_mean,
      appropriateness_class: out.appropriateness_class,
      necessity_mean: out.necessity_mean,
      necessity_class: out.necessity_class,
      secondary_review_triggered: out.secondary_review_triggered,
      secondary_review_reasons: out.secondary_review_reasons,
    } as never,
    { onConflict: 'case_id' }
  );

  if (ue) {
    console.error('computeAndUpsertCaseAggregate: upsert case_aggregates', ue);
    return { success: false, error: 'Failed to save case aggregate' };
  }

  // Phase 3: Create secondary review if triggered
  if (out.aggregation_status === 'SECONDARY_REVIEW_REQUIRED' || (out.aggregation_status === 'AWAITING_REVIEWS' && out.secondary_review_triggered)) {
    const aggregate = {
      id: '',
      case_id: caseId,
      n_assigned: out.n_assigned,
      n_valid: out.n_valid,
      n_stopped_insufficient: out.n_stopped_insufficient,
      aggregation_status: out.aggregation_status,
      missing_items: out.missing_items,
      binary_results: out.binary_results,
      appropriateness_mean: out.appropriateness_mean,
      appropriateness_class: out.appropriateness_class,
      necessity_mean: out.necessity_mean,
      necessity_class: out.necessity_class,
      secondary_review_triggered: out.secondary_review_triggered,
      secondary_review_reasons: out.secondary_review_reasons,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const createResult = await createSecondaryReview(caseId, aggregate);
    // Auto-open forum and invite participants
    if (createResult.success && createResult.secondaryReviewId) {
      const { openForumAndInviteParticipants } = await import('@/lib/actions/secondary-review');
      await openForumAndInviteParticipants(createResult.secondaryReviewId, caseId);
    }
  }

  // When we have a final primary result (SCORED_PRIMARY, no secondary review): write case_results, complete case, notify
  const isFinalPrimary =
    out.aggregation_status === 'SCORED_PRIMARY' && !out.secondary_review_triggered;

  if (isFinalPrimary) {
    const { data: existing } = await supabase.from('case_results').select('id').eq('case_id', caseId).maybeSingle();
    if (!existing) {
      const valid = reviews.filter((r) => r.status === 'SUBMITTED');
      const scores = valid.map((r) => r.appropriateness_score).filter((s): s is number => s != null);
      const n = scores.length;
      const meanScore = out.appropriateness_mean ?? (n ? scores.reduce((a, b) => a + b, 0) / n : 0);
      const sq = scores.map((s) => Math.pow((s ?? 0) - meanScore, 2));
      const stdDev = n > 0 ? Math.sqrt(sq.reduce((a, b) => a + b, 0) / n) : 0;
      const br = out.binary_results['agree_overall_plan_acceptable'];
      const percentAgreed = br && br.valid_count > 0 ? (br.agree_count / br.valid_count) * 100 : 0;

      await supabase.from('case_results').insert({
        case_id: caseId,
        final_class: out.appropriateness_class ?? 'UNCERTAIN',
        mean_score: meanScore,
        score_std_dev: stdDev,
        num_reviews: n,
        percent_agreed_with_proposed: percentAgreed,
        percent_recommended_alternative: 100 - percentAgreed,
      } as never);

      await supabase
        .from('cases')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() } as never)
        .eq('id', caseId);

      type CaseRow = { submitter_id: string; org_id: string };
      const { data: c } = await supabase.from('cases').select('submitter_id, org_id').eq('id', caseId).single();
      const cRow = c as CaseRow | null;
      if (cRow) {
        await supabase.from('notifications').insert({
          user_id: cRow.submitter_id,
          type: 'CASE_RESULT_READY',
          payload: { caseId },
          is_read: false,
        } as never);
        const { data: admins } = await supabase.from('profiles').select('id').eq('org_id', cRow.org_id).eq('role', 'ORG_ADMIN');
        const list = (admins as { id: string }[] | null) || [];
        if (list.length) {
          await supabase.from('notifications').insert(
            list.map((a) => ({ user_id: a.id, type: 'CASE_RESULT_READY', payload: { caseId }, is_read: false })) as never
          );
        }
      }
    }
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/cases/${caseId}/result`);
  revalidatePath('/dashboard');
  return { success: true };
}
