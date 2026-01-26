'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Review, Profile } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getStatusBadgeVariant, formatStatus } from '@/lib/utils/status';
import { Slider } from '@/components/ui/Slider';
import { DictationTextarea } from '@/components/ui/DictationTextarea';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';
import {
  saveReviewDraft,
  submitReview,
  submitStoppedInsufficientData,
  startReview,
  type ReviewFormData,
} from '@/lib/actions/reviews';
import { SymptomProfile, NeuroDeficits, Comorbidities, ConservativeCare } from '@/lib/actions/cases';
import { ImagingViewer } from '@/app/cases/[caseId]/_components/ImagingViewer';
import { RATIONALE_FACTOR_OPTIONS } from '@/lib/utils/review';

interface CaseData {
  id: string;
  patient_pseudo_id: string;
  anatomy_region: string;
  symptom_profile: SymptomProfile;
  neuro_deficits: NeuroDeficits;
  prior_surgery: boolean;
  prior_surgery_details: string;
  comorbidities: Comorbidities;
  conservative_care: ConservativeCare;
  diagnosis_codes: string[];
  proposed_procedure_codes: string[];
  free_text_summary: string;
  imaging_paths: string[];
}

interface ReviewWorkspaceProps {
  review: Review;
  caseData: CaseData;
  canEdit: boolean;
  profile: Profile;
  caseHasDecompressionPlusFusion: boolean;
  caseHasFusion: boolean;
}

function reviewToFormData(r: Review): ReviewFormData {
  return {
    sufficient_info: r.sufficient_info ?? null,
    info_deficiencies: r.info_deficiencies ?? null,
    more_than_necessary: r.more_than_necessary ?? null,
    info_burden_items: r.info_burden_items ?? null,
    agree_justification: r.agree_justification ?? null,
    justification_comment: r.justification_comment ?? null,
    agree_overall_plan_acceptable: r.agree_overall_plan_acceptable ?? null,
    would_personally_prescribe: r.would_personally_prescribe ?? null,
    preferred_procedure_text: r.preferred_procedure_text ?? null,
    agree_need_any_surgery_now: r.agree_need_any_surgery_now ?? null,
    benefit_from_more_nonsurgical_first: r.benefit_from_more_nonsurgical_first ?? null,
    proposed_nonsurgical_therapies_text: r.proposed_nonsurgical_therapies_text ?? null,
    agree_decompression_plan_acceptable: r.agree_decompression_plan_acceptable ?? null,
    agree_need_any_decompression_now: r.agree_need_any_decompression_now ?? null,
    suggested_decompression_text: r.suggested_decompression_text ?? null,
    agree_fusion_plan_acceptable: r.agree_fusion_plan_acceptable ?? null,
    agree_need_any_fusion_now: r.agree_need_any_fusion_now ?? null,
    suggested_fusion_text: r.suggested_fusion_text ?? null,
    appropriateness_score: r.appropriateness_score ?? null,
    necessity_score: r.necessity_score ?? null,
    rationale_factors: r.rationale_factors ?? null,
    rationale_other_text: r.rationale_other_text ?? null,
    final_comments: r.final_comments ?? null,
  };
}

function YesNo({
  value,
  onChange,
  disabled,
  label,
  required,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  disabled: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => !disabled && onChange(true)}
          disabled={disabled}
          className={clsx(
            'flex-1 py-2 rounded-lg font-medium text-sm transition-colors border-2',
            value === true ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-600 border-transparent'
          )}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => !disabled && onChange(false)}
          disabled={disabled}
          className={clsx(
            'flex-1 py-2 rounded-lg font-medium text-sm transition-colors border-2',
            value === false ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100 text-slate-600 border-transparent'
          )}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function ReviewWorkspace({
  review,
  caseData,
  canEdit,
  profile,
  caseHasDecompressionPlusFusion,
  caseHasFusion,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ReviewFormData>(() => reviewToFormData(review));

  // On open: if ASSIGNED and canEdit, start review (IN_PROGRESS)
  useEffect(() => {
    if (canEdit && review.status === 'ASSIGNED') {
      startReview(review.id);
    }
  }, [canEdit, review.id, review.status]);

  const update = <K extends keyof ReviewFormData>(field: K, value: ReviewFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    // If appropriateness < 7, clear necessity
    if (field === 'appropriateness_score' && (value as number) < 7) {
      setFormData((p) => ({ ...p, necessity_score: null }));
    }
  };

  const stopped = formData.sufficient_info === false;
  const showSteps2To5 = !stopped && formData.sufficient_info === true;

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrors({});
    const result = await saveReviewDraft(review.id, formData);
    if (!result.success) setErrors({ submit: result.error ?? 'Failed to save draft' });
    setIsSaving(false);
  };

  const handleSubmitStopped = async () => {
    if (formData.sufficient_info !== false || !formData.info_deficiencies?.trim()) {
      setErrors({ info_deficiencies: 'Please describe the information deficiencies.' });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    const result = await submitStoppedInsufficientData(review.id, {
      sufficient_info: false,
      info_deficiencies: formData.info_deficiencies.trim(),
    });
    if (result.success) {
      router.push('/reviews');
      router.refresh();
    } else {
      setErrors({ submit: result.error ?? 'Failed to submit' });
    }
    setIsSubmitting(false);
  };

  const handleSubmitFull = async () => {
    setIsSubmitting(true);
    setErrors({});
    const result = await submitReview(review.id, formData, {
      caseHasDecompressionPlusFusion,
      caseHasFusion,
    });
    if (result.success) {
      router.push(`/reviews/${review.id}/clarify`);
      router.refresh();
    } else {
      setErrors({ submit: result.error ?? 'Failed to submit review' });
    }
    setIsSubmitting(false);
  };

  const isStoppedStatus = review.status === 'STOPPED_INSUFFICIENT_DATA';
  const isSubmitted = review.status === 'SUBMITTED';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reviews" className="text-slate-500 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Review Case</h1>
            <p className="text-slate-600 text-sm">Case {caseData.id.slice(0, 8)}...</p>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(review.status)} size="md">
          {formatStatus(review.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Case Summary (unchanged) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>Case Overview</CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Patient ID</p>
                  <p className="font-medium">{caseData.patient_pseudo_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Anatomy Region</p>
                  <p className="font-medium">{caseData.anatomy_region}</p>
                </div>
              </div>
              {caseData.symptom_profile?.summary && (
                <div>
                  <p className="text-sm text-slate-500">Symptom Summary</p>
                  <p className="font-medium text-slate-700">{caseData.symptom_profile.summary}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>Clinical Details</CardHeader>
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Symptom Profile</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Duration</p>
                  <p className="font-medium">{caseData.symptom_profile?.duration || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Pain Pattern</p>
                  <p className="font-medium">{formatLegVsBack(caseData.symptom_profile?.leg_vs_back)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Severity</p>
                  <p className="font-medium">{caseData.symptom_profile?.severity != null ? `${caseData.symptom_profile.severity}/10` : '—'}</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Neurological Deficits</h4>
              <div className="flex flex-wrap gap-2">
                {formatNeuroDeficits(caseData.neuro_deficits)}
              </div>
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Prior Surgery</h4>
              {caseData.prior_surgery ? (
                <div>
                  <Badge variant="warning">Yes</Badge>
                  {caseData.prior_surgery_details && <p className="mt-2 text-sm text-slate-600">{caseData.prior_surgery_details}</p>}
                </div>
              ) : (
                <span className="text-slate-400 text-sm">None</span>
              )}
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Comorbidities</h4>
              <div className="flex flex-wrap gap-2">{formatComorbidities(caseData.comorbidities)}</div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Conservative Care</h4>
              <div className="flex flex-wrap gap-2">{formatConservativeCare(caseData.conservative_care)}</div>
              {caseData.conservative_care?.duration && <p className="mt-2 text-sm text-slate-500">Duration: {caseData.conservative_care.duration}</p>}
            </div>
          </Card>

          <Card>
            <CardHeader>Proposed Procedure</CardHeader>
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Diagnosis Codes</h4>
              <div className="flex flex-wrap gap-2">
                {(caseData.diagnosis_codes || []).length ? (
                  caseData.diagnosis_codes!.map((c, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">{c}</span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None</span>
                )}
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Procedure Codes</h4>
              <div className="flex flex-wrap gap-2">
                {(caseData.proposed_procedure_codes || []).length ? (
                  caseData.proposed_procedure_codes!.map((c, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{c}</span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None</span>
                )}
              </div>
            </div>
            {caseData.free_text_summary && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Clinical Rationale</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{caseData.free_text_summary}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>Imaging</CardHeader>
            {(caseData.imaging_paths?.length ?? 0) > 0 ? (
              <ImagingViewer imagingPaths={caseData.imaging_paths!} />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No imaging files uploaded</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Phase 1 – 5-step form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>Your Assessment</CardHeader>

            {(isSubmitted || isStoppedStatus) && !canEdit && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-600">
                  {isStoppedStatus
                    ? 'This review was stopped due to insufficient data. The form below shows the submitted answers.'
                    : 'This review has been submitted and cannot be modified.'}
                </p>
              </div>
            )}

            {/* ——— Step 1: Data sufficiency ——— */}
            <section className="mb-8">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Step 1: Data sufficiency</h3>
              <YesNo
                label="Is there sufficient information to complete this review?"
                value={formData.sufficient_info}
                onChange={(v) => update('sufficient_info', v)}
                disabled={!canEdit}
                required
              />
              {formData.sufficient_info === false && (
                <div className="mt-4">
                  <DictationTextarea
                    label="Describe the information deficiencies"
                    value={formData.info_deficiencies ?? ''}
                    onChange={(v) => update('info_deficiencies', v)}
                    placeholder="What is missing or insufficient?"
                    rows={3}
                    disabled={!canEdit}
                    error={errors.info_deficiencies}
                  />
                  {canEdit && (
                    <Button
                      className="mt-4"
                      onClick={handleSubmitStopped}
                      disabled={isSubmitting || !(formData.info_deficiencies?.trim())}
                      isLoading={isSubmitting}
                    >
                      Submit as stopped (insufficient data)
                    </Button>
                  )}
                </div>
              )}
              {showSteps2To5 && (
                <>
                  <div className="mt-4">
                    <YesNo
                      label="Was more than necessary information provided?"
                      value={formData.more_than_necessary}
                      onChange={(v) => update('more_than_necessary', v)}
                      disabled={!canEdit}
                      required
                    />
                  </div>
                  {formData.more_than_necessary === true && (
                    <div className="mt-4">
                      <DictationTextarea
                        label="Which items contributed to information burden?"
                        value={formData.info_burden_items ?? ''}
                        onChange={(v) => update('info_burden_items', v)}
                        placeholder="Describe unnecessary or burdensome elements..."
                        rows={2}
                        disabled={!canEdit}
                        error={errors.info_burden_items}
                      />
                    </div>
                  )}
                </>
              )}
            </section>

            {showSteps2To5 && (
              <>
                {/* ——— Step 2: Justification ——— */}
                <section className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Step 2: Justification agreement</h3>
                  <YesNo
                    label="Do you agree with the clinical justification for the proposed plan?"
                    value={formData.agree_justification}
                    onChange={(v) => update('agree_justification', v)}
                    disabled={!canEdit}
                    required
                  />
                  {formData.agree_justification === false && (
                    <div className="mt-4">
                      <DictationTextarea
                        label="Comment"
                        value={formData.justification_comment ?? ''}
                        onChange={(v) => update('justification_comment', v)}
                        placeholder="Explain your disagreement..."
                        rows={3}
                        disabled={!canEdit}
                        error={errors.justification_comment}
                      />
                    </div>
                  )}
                </section>

                {/* ——— Step 3: Care pathway ——— */}
                <section className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Step 3: Care pathway assessment</h3>

                  <YesNo
                    label="Is the overall surgical plan acceptable?"
                    value={formData.agree_overall_plan_acceptable}
                    onChange={(v) => update('agree_overall_plan_acceptable', v)}
                    disabled={!canEdit}
                    required
                  />

                  {formData.agree_overall_plan_acceptable === true && (
                    <div className="mt-4 space-y-4">
                      <YesNo
                        label="Would you personally prescribe this plan?"
                        value={formData.would_personally_prescribe}
                        onChange={(v) => update('would_personally_prescribe', v)}
                        disabled={!canEdit}
                        required
                      />
                      {formData.would_personally_prescribe === false && (
                        <DictationTextarea
                          label="Your preferred procedure"
                          value={formData.preferred_procedure_text ?? ''}
                          onChange={(v) => update('preferred_procedure_text', v)}
                          placeholder="Describe your preferred approach..."
                          rows={3}
                          disabled={!canEdit}
                          error={errors.preferred_procedure_text}
                        />
                      )}
                    </div>
                  )}

                  {formData.agree_overall_plan_acceptable === false && (
                    <div className="mt-4 space-y-4">
                      <YesNo
                        label="Is any surgery needed now?"
                        value={formData.agree_need_any_surgery_now}
                        onChange={(v) => update('agree_need_any_surgery_now', v)}
                        disabled={!canEdit}
                        required
                      />
                      {formData.agree_need_any_surgery_now === false && (
                        <>
                          <YesNo
                            label="Would the patient benefit from more nonsurgical care first?"
                            value={formData.benefit_from_more_nonsurgical_first}
                            onChange={(v) => update('benefit_from_more_nonsurgical_first', v)}
                            disabled={!canEdit}
                            required
                          />
                          {formData.benefit_from_more_nonsurgical_first === true && (
                            <DictationTextarea
                              label="Proposed nonsurgical therapies"
                              value={formData.proposed_nonsurgical_therapies_text ?? ''}
                              onChange={(v) => update('proposed_nonsurgical_therapies_text', v)}
                              placeholder="e.g. PT, injections, pain management..."
                              rows={3}
                              disabled={!canEdit}
                              error={errors.proposed_nonsurgical_therapies_text}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {caseHasDecompressionPlusFusion && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase">Decompression (case includes decompression + fusion)</h4>
                      <YesNo
                        label="Is the decompression plan acceptable?"
                        value={formData.agree_decompression_plan_acceptable}
                        onChange={(v) => update('agree_decompression_plan_acceptable', v)}
                        disabled={!canEdit}
                        required
                      />
                      {formData.agree_decompression_plan_acceptable === false && (
                        <>
                          <YesNo
                            label="Is any decompression needed now?"
                            value={formData.agree_need_any_decompression_now}
                            onChange={(v) => update('agree_need_any_decompression_now', v)}
                            disabled={!canEdit}
                            required
                          />
                          {formData.agree_need_any_decompression_now === true && (
                            <DictationTextarea
                              label="Suggested decompression"
                              value={formData.suggested_decompression_text ?? ''}
                              onChange={(v) => update('suggested_decompression_text', v)}
                              placeholder="Describe your recommended decompression..."
                              rows={3}
                              disabled={!canEdit}
                              error={errors.suggested_decompression_text}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {caseHasFusion && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase">Fusion</h4>
                      <YesNo
                        label="Is the fusion plan acceptable?"
                        value={formData.agree_fusion_plan_acceptable}
                        onChange={(v) => update('agree_fusion_plan_acceptable', v)}
                        disabled={!canEdit}
                        required
                      />
                      {formData.agree_fusion_plan_acceptable === false && (
                        <>
                          <YesNo
                            label="Is any fusion needed now?"
                            value={formData.agree_need_any_fusion_now}
                            onChange={(v) => update('agree_need_any_fusion_now', v)}
                            disabled={!canEdit}
                            required
                          />
                          {formData.agree_need_any_fusion_now === true && (
                            <DictationTextarea
                              label="Suggested fusion"
                              value={formData.suggested_fusion_text ?? ''}
                              onChange={(v) => update('suggested_fusion_text', v)}
                              placeholder="Describe your recommended fusion approach..."
                              rows={3}
                              disabled={!canEdit}
                              error={errors.suggested_fusion_text}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </section>

                {/* ——— Step 4: Ratings ——— */}
                <section className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Step 4: Quantitative ratings</h3>
                  <div className="mb-6">
                    <Slider
                      label="Appropriateness score (1–9)"
                      min={1}
                      max={9}
                      step={1}
                      value={formData.appropriateness_score ?? 5}
                      onChange={(e) => update('appropriateness_score', parseInt(e.target.value, 10))}
                      disabled={!canEdit}
                      colorScale="appropriateness"
                      markers={[
                        { value: 1, label: '1 Inappr.' },
                        { value: 5, label: '5 Uncertain' },
                        { value: 9, label: '9 Appr.' },
                      ]}
                      error={errors.appropriateness_score}
                    />
                  </div>
                  {(formData.appropriateness_score ?? 0) >= 7 && (
                    <Slider
                      label="Necessity score (1–9) — required when appropriateness ≥ 7"
                      min={1}
                      max={9}
                      step={1}
                      value={formData.necessity_score ?? 5}
                      onChange={(e) => update('necessity_score', parseInt(e.target.value, 10))}
                      disabled={!canEdit}
                      colorScale="appropriateness"
                      error={errors.necessity_score}
                    />
                  )}
                </section>

                {/* ——— Step 5: Rationale ——— */}
                <section className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Step 5: Rationale factors and comments</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select all that apply</label>
                  <div className="flex flex-wrap gap-2">
                    {RATIONALE_FACTOR_OPTIONS.map((opt) => {
                      const selected = (formData.rationale_factors ?? []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (!canEdit) return;
                            const prev = formData.rationale_factors ?? [];
                            const next = selected ? prev.filter((x) => x !== opt.value) : [...prev, opt.value];
                            update('rationale_factors', next.length ? next : null);
                          }}
                          disabled={!canEdit}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                            selected ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {(formData.rationale_factors ?? []).includes('OTHER') && (
                    <div className="mt-4">
                      <Input
                        label="Please specify (Other)"
                        value={formData.rationale_other_text ?? ''}
                        onChange={(e) => update('rationale_other_text', e.target.value)}
                        placeholder="Describe..."
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <DictationTextarea
                      label="Final comments (optional, ~500 words max)"
                      value={formData.final_comments ?? ''}
                      onChange={(v) => update('final_comments', v)}
                      placeholder="Additional context or recommendations..."
                      rows={4}
                      disabled={!canEdit}
                    />
                  </div>
                </section>
              </>
            )}

            {errors.submit && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving || isSubmitting} isLoading={isSaving}>
                  Save Draft
                </Button>
                {showSteps2To5 && (
                  <Button onClick={handleSubmitFull} disabled={isSaving || isSubmitting} isLoading={isSubmitting}>
                    Submit Review
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Scoring guide */}
          <Card>
            <CardHeader>Scoring guide</CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">7–9</div>
                <div>
                  <p className="font-medium text-green-800">Appropriate</p>
                  <p className="text-green-700 text-xs">Procedure is appropriate for clinical indications. Necessity score is required.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">4–6</div>
                <div>
                  <p className="font-medium text-amber-800">Uncertain</p>
                  <p className="text-amber-700 text-xs">May be appropriate depending on circumstances. Necessity is not collected.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">1–3</div>
                <div>
                  <p className="font-medium text-red-800">Inappropriate</p>
                  <p className="text-red-700 text-xs">Procedure is not appropriate for this scenario.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatLegVsBack(v?: string): string {
  switch (v) {
    case 'leg_dominant': return 'Leg Dominant';
    case 'back_dominant': return 'Back Dominant';
    case 'equal': return 'Equal';
    default: return '—';
  }
}

function formatNeuroDeficits(nd: NeuroDeficits): React.ReactNode {
  const entries = nd ? Object.entries(nd).filter(([, v]) => v) : [];
  if (entries.length === 0) return <span className="text-slate-400 text-sm">None reported</span>;
  return (
    <>
      {entries.map(([key]) => (
        <span key={key} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
          {key === 'motor_weakness' ? 'Motor' : key === 'sensory_loss' ? 'Sensory' : key === 'gait_instability' ? 'Gait' : key === 'bowel_bladder' ? 'Bowel/Bladder' : key.replace(/_/g, ' ')}
        </span>
      ))}
    </>
  );
}

function formatComorbidities(c: Comorbidities): React.ReactNode {
  const items: string[] = [];
  if (c?.diabetes) items.push('Diabetes');
  if (c?.smoker) items.push('Smoker');
  if (c?.obesity) items.push('Obesity');
  if (c?.heart_disease) items.push('Heart Disease');
  if (c?.osteoporosis) items.push('Osteoporosis');
  if (c?.other) items.push(c.other);
  if (items.length === 0) return <span className="text-slate-400 text-sm">None reported</span>;
  return items.map((x, i) => (
    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">{x}</span>
  ));
}

function formatConservativeCare(cc: ConservativeCare): React.ReactNode {
  const items: string[] = [];
  if (cc?.pt_tried) items.push('Physical Therapy');
  if (cc?.meds) items.push('Medications');
  if (cc?.injections) items.push('Injections');
  if (items.length === 0) return <span className="text-slate-400 text-sm">None reported</span>;
  return items.map((x, i) => (
    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{x}</span>
  ));
}
