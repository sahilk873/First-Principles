'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type {
  SecondaryReview,
  SecondaryReviewStatus,
  SecondaryParticipant,
  ForumThread,
  ForumPost,
  SecondaryReRating,
  SecondaryOutcome,
  CaseAggregate,
} from '@/types/database';
import {
  DEFAULT_SECONDARY_REVIEW_POLICY,
  canTransition,
  selectPeerSurgeons,
  checkReratingQuorum,
  computeAdjustedScores,
  generateSummaryAssessment,
  detectChangedFromPrimary,
  type SecondaryReviewPolicy,
} from '@/lib/utils/secondary-review';

// ---------------------------------------------------------------------------
// Step 1: Create Secondary Review Session
// ---------------------------------------------------------------------------

export async function createSecondaryReview(
  caseId: string,
  aggregate: CaseAggregate,
  policy?: Partial<SecondaryReviewPolicy>
): Promise<{ success: boolean; secondaryReviewId?: string; error?: string }> {
  const supabase = createServiceRoleClient();

  // Check if already exists
  const { data: existing } = await supabase
    .from('secondary_reviews')
    .select('id')
    .eq('case_id', caseId)
    .maybeSingle();

  if (existing && (existing as { id: string }).id) {
    return { success: true, secondaryReviewId: (existing as { id: string }).id };
  }

  const fullPolicy = { ...DEFAULT_SECONDARY_REVIEW_POLICY, ...policy };
  const policySnapshot = fullPolicy;

  // Get original reviewer IDs
  const { data: originalReviews } = await supabase
    .from('reviews')
    .select('reviewer_id')
    .eq('case_id', caseId)
    .in('status', ['SUBMITTED', 'STOPPED_INSUFFICIENT_DATA']);

  const originalReviewerIds = ((originalReviews || []) as Array<{ reviewer_id: string }>).map(
    (r) => r.reviewer_id
  );

  // Create secondary review
  const { data: sr, error: srErr } = await supabase
    .from('secondary_reviews')
    .insert({
      case_id: caseId,
      status: 'CREATED',
      trigger_reasons: aggregate.secondary_review_reasons,
      policy_snapshot: policySnapshot,
    } as never)
    .select('id')
    .single();

  if (srErr || !sr) {
    return { success: false, error: 'Failed to create secondary review' };
  }

  const secondaryReviewId = (sr as { id: string }).id;

  // Create main forum thread with pinned context
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, patient_pseudo_id, anatomy_region')
    .eq('id', caseId)
    .single();

  const pinnedContext = {
    case_id: caseId,
    case_patient_id: (caseRow as { patient_pseudo_id: string } | null)?.patient_pseudo_id || 'N/A',
    primary_appropriateness_mean: aggregate.appropriateness_mean,
    primary_appropriateness_class: aggregate.appropriateness_class,
    primary_necessity_mean: aggregate.necessity_mean,
    trigger_reasons: aggregate.secondary_review_reasons,
    controversial_items: Object.entries(aggregate.binary_results)
      .filter(([_, br]) => br.concordance_tier === 'INTERMEDIATE')
      .map(([q, _]) => ({ question: q, tier: 'INTERMEDIATE' })),
  };

  await supabase.from('forum_threads').insert({
    secondary_review_id: secondaryReviewId,
    title: `Secondary Review: Case ${(caseRow as { patient_pseudo_id: string } | null)?.patient_pseudo_id || caseId.slice(0, 8)}`,
    pinned_context: pinnedContext,
  } as never);

  // Add original reviewers as participants
  if (originalReviewerIds.length > 0) {
    await supabase.from('secondary_participants').insert(
      originalReviewerIds.map((uid) => ({
        secondary_review_id: secondaryReviewId,
        user_id: uid,
        role: 'ORIGINAL_REVIEWER',
        is_active: true,
      })) as never
    );
  }

  revalidatePath(`/cases/${caseId}`);
  return { success: true, secondaryReviewId };
}

// ---------------------------------------------------------------------------
// Step 2: Invite Participants (Open Forum)
// ---------------------------------------------------------------------------

export async function openForumAndInviteParticipants(
  secondaryReviewId: string,
  caseId: string,
  policy?: Partial<SecondaryReviewPolicy>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data: sr } = await supabase
    .from('secondary_reviews')
    .select('status, policy_snapshot')
    .eq('id', secondaryReviewId)
    .single();

  const srRow = sr as { status: string; policy_snapshot: unknown } | null;
  if (!srRow || !canTransition(srRow.status as SecondaryReviewStatus, 'FORUM_OPEN')) {
    return { success: false, error: 'Invalid state transition' };
  }

  const fullPolicy = {
    ...DEFAULT_SECONDARY_REVIEW_POLICY,
    ...((srRow.policy_snapshot as Partial<SecondaryReviewPolicy>) || {}),
    ...policy,
  };

  // Get case org to exclude
  const { data: caseRow } = await supabase
    .from('cases')
    .select('org_id')
    .eq('id', caseId)
    .single();

  const excludeOrgId = (caseRow as { org_id: string } | null)?.org_id;

  // Get existing participants
  const { data: existing } = await supabase
    .from('secondary_participants')
    .select('user_id')
    .eq('secondary_review_id', secondaryReviewId);

  const excludeUserIds = ((existing || []) as Array<{ user_id: string }>).map((p) => p.user_id);

  // Select peer surgeons
  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, org_id, role, is_expert_certified, specialties')
    .eq('role', 'EXPERT_REVIEWER')
    .eq('is_expert_certified', true);

  const peerIds = selectPeerSurgeons(
    (candidates || []) as Array<{
      id: string;
      org_id: string;
      role: string;
      is_expert_certified: boolean;
      specialties: string[];
    }>,
    fullPolicy.peer_cohort_size_target,
    { excludeOrgId, excludeUserIds }
  );

  // Add peer surgeons as participants
  if (peerIds.length > 0) {
    await supabase.from('secondary_participants').insert(
      peerIds.map((uid) => ({
        secondary_review_id: secondaryReviewId,
        user_id: uid,
        role: 'PEER_SURGEON',
        is_active: true,
      })) as never
    );

    // Create notifications
    await supabase.from('notifications').insert(
      peerIds.map((uid) => ({
        user_id: uid,
        type: 'CASE_ASSIGNED',
        payload: { caseId, secondaryReviewId, phase: 'secondary_review' },
        is_read: false,
      })) as never
    );
  }

  // Update status
  await supabase
    .from('secondary_reviews')
    .update({
      status: 'FORUM_OPEN',
      opened_at: new Date().toISOString(),
    } as never)
    .eq('id', secondaryReviewId);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/reviews/secondary/${secondaryReviewId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Forum: Create Post
// ---------------------------------------------------------------------------

export async function createForumPost(
  threadId: string,
  body: string,
  type: 'COMMENT' | 'QUESTION' | 'ANSWER' | 'MOD_NOTE' = 'COMMENT'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('forum_posts').insert({
    thread_id: threadId,
    author_id: user.id,
    body: body.trim(),
    type,
  } as never);

  if (error) return { success: false, error: error.message };

  const { data: thread } = await supabase
    .from('forum_threads')
    .select('secondary_review_id')
    .eq('id', threadId)
    .single();

  if (thread) {
    const { data: sr } = await supabase
      .from('secondary_reviews')
      .select('case_id')
      .eq('id', (thread as { secondary_review_id: string }).secondary_review_id)
      .single();

    if (sr) {
      revalidatePath(`/reviews/secondary/${(thread as { secondary_review_id: string }).secondary_review_id}`);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 3 → 4: Transition to Re-rating
// ---------------------------------------------------------------------------

export async function openRerating(
  secondaryReviewId: string,
  caseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: sr } = await supabase
    .from('secondary_reviews')
    .select('status')
    .eq('id', secondaryReviewId)
    .single();

  const srRow = sr as { status: string } | null;
  if (!srRow || !canTransition(srRow.status as SecondaryReviewStatus, 'RERATING_OPEN')) {
    return { success: false, error: 'Invalid state transition' };
  }

  await supabase
    .from('secondary_reviews')
    .update({
      status: 'RERATING_OPEN',
      closed_at: new Date().toISOString(),
    } as never)
    .eq('id', secondaryReviewId);

  // Notify participants
  const { data: participants } = await supabase
    .from('secondary_participants')
    .select('user_id')
    .eq('secondary_review_id', secondaryReviewId)
    .eq('is_active', true);

  if (participants && participants.length > 0) {
    await supabase.from('notifications').insert(
      (participants as Array<{ user_id: string }>).map((p) => ({
        user_id: p.user_id,
        type: 'REVIEW_REMINDER',
        payload: { caseId, secondaryReviewId, phase: 'rerating' },
        is_read: false,
      })) as never
    );
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/reviews/secondary/${secondaryReviewId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 4: Submit Re-rating
// ---------------------------------------------------------------------------

export async function submitRerating(
  secondaryReviewId: string,
  data: {
    appropriateness_score_final: number;
    necessity_score_final: number | null;
    rationale_final: string;
    binary_votes_final?: Record<string, boolean>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate
  if (
    data.appropriateness_score_final < 1 ||
    data.appropriateness_score_final > 9
  ) {
    return { success: false, error: 'Appropriateness score must be 1-9' };
  }
  if (data.appropriateness_score_final >= 7 && !data.necessity_score_final) {
    return { success: false, error: 'Necessity score required when appropriateness >= 7' };
  }
  if (!data.rationale_final?.trim()) {
    return { success: false, error: 'Rationale is required' };
  }

  // Check participant
  const { data: participant } = await supabase
    .from('secondary_participants')
    .select('role')
    .eq('secondary_review_id', secondaryReviewId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!participant) {
    return { success: false, error: 'Not a participant in this secondary review' };
  }

  // Get case_id from secondary review
  const { data: srCase } = await supabase
    .from('secondary_reviews')
    .select('case_id')
    .eq('id', secondaryReviewId)
    .single();

  // Get primary review to detect change
  const { data: primaryReview } = await supabase
    .from('reviews')
    .select('appropriateness_score, necessity_score')
    .eq('case_id', (srCase as { case_id: string } | null)?.case_id || '')
    .eq('reviewer_id', user.id)
    .eq('status', 'SUBMITTED')
    .maybeSingle();

  const changedFromPrimary = detectChangedFromPrimary(
    primaryReview as { appropriateness_score: number | null; necessity_score: number | null } | null,
    {
      appropriateness_score_final: data.appropriateness_score_final,
      necessity_score_final: data.necessity_score_final,
    }
  );

  // Upsert re-rating
  const { error } = await supabase.from('secondary_reratings').upsert(
    {
      secondary_review_id: secondaryReviewId,
      user_id: user.id,
      appropriateness_score_final: data.appropriateness_score_final,
      necessity_score_final: data.necessity_score_final,
      binary_votes_final: data.binary_votes_final || {},
      rationale_final: data.rationale_final.trim(),
      changed_from_primary: changedFromPrimary,
    } as never,
    { onConflict: 'secondary_review_id,user_id' }
  );

  if (error) return { success: false, error: error.message };

  // Check quorum and auto-transition if met
  const { data: reratings } = await supabase
    .from('secondary_reratings')
    .select('user_id')
    .eq('secondary_review_id', secondaryReviewId);

  const { data: participants } = await supabase
    .from('secondary_participants')
    .select('user_id, role')
    .eq('secondary_review_id', secondaryReviewId)
    .eq('is_active', true);

  const { data: sr } = await supabase
    .from('secondary_reviews')
    .select('status, policy_snapshot')
    .eq('id', secondaryReviewId)
    .single();

  const srRow = sr as { status: string; policy_snapshot: unknown } | null;
  if (srRow && reratings && participants) {
    const policy = {
      ...DEFAULT_SECONDARY_REVIEW_POLICY,
      ...((srRow.policy_snapshot as Partial<SecondaryReviewPolicy>) || {}),
    };
    const reratingsArray = (reratings as Array<{ user_id: string }>).map((r) => ({
      user_id: r.user_id,
      role: 'ORIGINAL_REVIEWER' as const,
    }));
    const participantsArray = (participants as Array<{ user_id: string; role: string }>).map((p) => ({
      user_id: p.user_id,
      role: p.role as any,
    }));
    const quorum = checkReratingQuorum(reratingsArray, participantsArray, policy);

    if (quorum.met && srRow.status === 'RERATING_OPEN') {
      await supabase
        .from('secondary_reviews')
        .update({ status: 'LOCKED_SCORING' } as never)
        .eq('id', secondaryReviewId);
    }
  }

  revalidatePath(`/reviews/secondary/${secondaryReviewId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 5: Compute Adjusted Aggregates & Generate Outcome
// ---------------------------------------------------------------------------

export async function computeAndFinalizeSecondaryOutcome(
  secondaryReviewId: string,
  caseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: sr } = await supabase
    .from('secondary_reviews')
    .select('status, policy_snapshot')
    .eq('id', secondaryReviewId)
    .single();

  const srRow = sr as { status: string; policy_snapshot: unknown } | null;
  if (!srRow || srRow.status !== 'LOCKED_SCORING') {
    return { success: false, error: 'Secondary review not in LOCKED_SCORING state' };
  }

  const policy = {
    ...DEFAULT_SECONDARY_REVIEW_POLICY,
    ...((srRow.policy_snapshot as Partial<SecondaryReviewPolicy>) || {}),
  };

  // Get re-ratings
  const { data: reratings } = await supabase
    .from('secondary_reratings')
    .select('appropriateness_score_final, necessity_score_final')
    .eq('secondary_review_id', secondaryReviewId);

  const reratingsArray = (reratings || []) as Array<{
    appropriateness_score_final: number;
    necessity_score_final: number | null;
  }>;

  if (reratingsArray.length === 0) {
    return { success: false, error: 'No re-ratings found' };
  }

  // Get primary aggregate for comparison
  const { data: aggregate } = await supabase
    .from('case_aggregates')
    .select('*')
    .eq('case_id', caseId)
    .single();

  // Compute adjusted scores
  const adjustedScores = computeAdjustedScores(
    reratingsArray.map((r) => ({
      appropriateness_score_final: r.appropriateness_score_final,
      necessity_score_final: r.necessity_score_final,
    })),
    policy
  );

  // Get participants count
  const { data: participants } = await supabase
    .from('secondary_participants')
    .select('id')
    .eq('secondary_review_id', secondaryReviewId)
    .eq('is_active', true);

  // Generate summary assessment
  const controversialItems = aggregate
    ? Object.entries((aggregate as CaseAggregate).binary_results)
        .filter(([_, br]) => br.concordance_tier === 'INTERMEDIATE')
        .map(([q, _]) => ({ question: q, tier: 'INTERMEDIATE' }))
    : [];

  const summary = generateSummaryAssessment({
    adjustedScores,
    primaryScores: aggregate
      ? {
          appropriateness_mean: (aggregate as CaseAggregate).appropriateness_mean,
          appropriateness_class: (aggregate as CaseAggregate).appropriateness_class || 'UNCERTAIN',
          necessity_mean: (aggregate as CaseAggregate).necessity_mean,
        }
      : {
          appropriateness_mean: null,
          appropriateness_class: null,
          necessity_mean: null,
        },
    controversialItems,
    reratingsCount: reratingsArray.length,
    participantsCount: participants?.length || 0,
  });

  // Create outcome
  const { error: outcomeErr } = await supabase.from('secondary_outcomes').insert({
    secondary_review_id: secondaryReviewId,
    adjusted_appropriateness_mean: adjustedScores.appropriateness_mean,
    adjusted_appropriateness_class: adjustedScores.appropriateness_class,
    adjusted_necessity_mean: adjustedScores.necessity_mean,
    adjusted_necessity_class: adjustedScores.necessity_class,
    summary_assessment: summary,
    participants_count: participants?.length || 0,
    reratings_count: reratingsArray.length,
  } as never);

  if (outcomeErr) {
    return { success: false, error: outcomeErr.message };
  }

  // Update secondary review to COMPLETED
  await supabase
    .from('secondary_reviews')
    .update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    } as never)
    .eq('id', secondaryReviewId);

  // Update case status to SCORED_FINAL
  await supabase
    .from('cases')
    .update({ status: 'SCORED_FINAL' } as never)
    .eq('id', caseId);

  // Create case_results from secondary outcome (for backward compat)
  const { data: existingResult } = await supabase
    .from('case_results')
    .select('id')
    .eq('case_id', caseId)
    .maybeSingle();

  if (!existingResult) {
    const appScores = reratingsArray.map((r) => r.appropriateness_score_final);
    const stdDev = Math.sqrt(
      appScores
        .map((s) => Math.pow(s - adjustedScores.appropriateness_mean, 2))
        .reduce((a, b) => a + b, 0) / appScores.length
    );

    await supabase.from('case_results').insert({
      case_id: caseId,
      final_class: adjustedScores.appropriateness_class,
      mean_score: adjustedScores.appropriateness_mean,
      score_std_dev: stdDev,
      num_reviews: reratingsArray.length,
      percent_agreed_with_proposed: 0, // TODO: compute from binary if available
      percent_recommended_alternative: 0,
    } as never);
  }

  // Notify surgeon
  const { data: caseRow } = await supabase
    .from('cases')
    .select('submitter_id, org_id')
    .eq('id', caseId)
    .single();

  if (caseRow) {
    await supabase.from('notifications').insert({
      user_id: (caseRow as { submitter_id: string }).submitter_id,
      type: 'CASE_RESULT_READY',
      payload: { caseId, secondaryReviewId, phase: 'secondary_review_complete' },
      is_read: false,
    } as never);
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/cases/${caseId}/result`);
  revalidatePath(`/reviews/secondary/${secondaryReviewId}`);
  return { success: true };
}
