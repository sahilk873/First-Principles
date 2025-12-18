'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Review, Profile, PreferredApproach } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant, formatStatus } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { clsx } from 'clsx';
import { saveReviewDraft, submitReview, ReviewFormData } from '@/lib/actions/reviews';
import { SymptomProfile, NeuroDeficits, Comorbidities, ConservativeCare } from '@/lib/actions/cases';

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
}

const PREFERRED_APPROACH_OPTIONS = [
  { value: '', label: 'Select approach...' },
  { value: 'DECOMPRESSION_ONLY', label: 'Decompression Only' },
  { value: 'PLF', label: 'PLF (Posterolateral Fusion)' },
  { value: 'TLIF', label: 'TLIF (Transforaminal Lumbar Interbody Fusion)' },
  { value: 'ALIF', label: 'ALIF (Anterior Lumbar Interbody Fusion)' },
  { value: 'OTHER', label: 'Other' },
];

export function ReviewWorkspace({ review, caseData, canEdit, profile }: ReviewWorkspaceProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<ReviewFormData>({
    surgery_indicated: review.surgery_indicated ?? false,
    fusion_indicated: review.fusion_indicated ?? false,
    preferred_approach: review.preferred_approach || 'DECOMPRESSION_ONLY',
    appropriateness_score: review.appropriateness_score || 5,
    successful_outcome_likely: review.successful_outcome_likely ?? false,
    optimization_recommended: review.optimization_recommended ?? false,
    missing_data_flag: review.missing_data_flag ?? false,
    missing_data_description: review.missing_data_description || '',
    comments: review.comments || '',
  });

  const updateFormData = <K extends keyof ReviewFormData>(field: K, value: ReviewFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrors({});

    try {
      const result = await saveReviewDraft(review.id, formData);
      if (!result.success) {
        setErrors({ submit: result.error || 'Failed to save draft' });
      }
    } catch (err) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    const newErrors: Record<string, string> = {};

    if (!formData.appropriateness_score || formData.appropriateness_score < 1 || formData.appropriateness_score > 9) {
      newErrors.appropriateness_score = 'Score must be between 1 and 9';
    }
    if (!formData.preferred_approach) {
      newErrors.preferred_approach = 'Please select a preferred approach';
    }
    if (formData.missing_data_flag && !formData.missing_data_description.trim()) {
      newErrors.missing_data_description = 'Please describe the missing data';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await submitReview(review.id, formData);
      if (result.success) {
        router.push('/reviews');
        router.refresh();
      } else {
        setErrors({ submit: result.error || 'Failed to submit review' });
      }
    } catch (err) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Case Summary */}
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
              {caseData.symptom_profile.summary && (
                <div>
                  <p className="text-sm text-slate-500">Symptom Summary</p>
                  <p className="font-medium text-slate-700">{caseData.symptom_profile.summary}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>Clinical Details</CardHeader>
            
            {/* Symptom Profile */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Symptom Profile</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Duration</p>
                  <p className="font-medium">{caseData.symptom_profile.duration || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Pain Pattern</p>
                  <p className="font-medium">{formatLegVsBack(caseData.symptom_profile.leg_vs_back)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs">Severity</p>
                  <p className="font-medium">{caseData.symptom_profile.severity ? `${caseData.symptom_profile.severity}/10` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Neuro Deficits */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Neurological Deficits</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(caseData.neuro_deficits).filter(([, v]) => v).length > 0 ? (
                  Object.entries(caseData.neuro_deficits).filter(([, v]) => v).map(([key]) => (
                    <span key={key} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                      {formatNeuroDeficit(key)}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None reported</span>
                )}
              </div>
            </div>

            {/* Prior Surgery */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Prior Surgery</h4>
              {caseData.prior_surgery ? (
                <div>
                  <Badge variant="warning">Yes</Badge>
                  {caseData.prior_surgery_details && (
                    <p className="mt-2 text-sm text-slate-600">{caseData.prior_surgery_details}</p>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 text-sm">None</span>
              )}
            </div>

            {/* Comorbidities */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Comorbidities</h4>
              <div className="flex flex-wrap gap-2">
                {formatComorbidities(caseData.comorbidities).length > 0 ? (
                  formatComorbidities(caseData.comorbidities).map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None reported</span>
                )}
              </div>
            </div>

            {/* Conservative Care */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Conservative Care</h4>
              <div className="flex flex-wrap gap-2">
                {formatConservativeCare(caseData.conservative_care).length > 0 ? (
                  formatConservativeCare(caseData.conservative_care).map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None reported</span>
                )}
              </div>
              {caseData.conservative_care.duration && (
                <p className="mt-2 text-sm text-slate-500">Duration: {caseData.conservative_care.duration}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>Proposed Procedure</CardHeader>
            
            {/* Diagnosis Codes */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Diagnosis Codes</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.diagnosis_codes.length > 0 ? (
                  caseData.diagnosis_codes.map((code, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                      {code}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None</span>
                )}
              </div>
            </div>

            {/* Procedure Codes */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Procedure Codes</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.proposed_procedure_codes.length > 0 ? (
                  caseData.proposed_procedure_codes.map((code, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                      {code}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">None</span>
                )}
              </div>
            </div>

            {/* Clinical Rationale */}
            {caseData.free_text_summary && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Clinical Rationale</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{caseData.free_text_summary}</p>
              </div>
            )}
          </Card>

          {/* Imaging */}
          {caseData.imaging_paths.length > 0 && (
            <Card>
              <CardHeader>Imaging</CardHeader>
              <div className="space-y-2">
                {caseData.imaging_paths.map((path, index) => {
                  const fileName = path.split('/').pop() || path;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{fileName}</span>
                      </div>
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imaging/${path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View
                      </a>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Review Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>Your Assessment</CardHeader>
            
            {/* Read-only message for submitted reviews */}
            {!canEdit && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-600">
                  {review.status === 'SUBMITTED' 
                    ? 'This review has been submitted and cannot be modified.'
                    : 'You are viewing this review in read-only mode.'}
                </p>
              </div>
            )}

            {/* Appropriateness Score */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Appropriateness Score <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={formData.appropriateness_score}
                  onChange={(e) => updateFormData('appropriateness_score', parseInt(e.target.value))}
                  disabled={!canEdit}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className={clsx(
                  'w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold',
                  formData.appropriateness_score >= 7 ? 'bg-green-100 text-green-700' :
                  formData.appropriateness_score >= 4 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {formData.appropriateness_score}
                </span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>1 - Inappropriate</span>
                <span>5 - Uncertain</span>
                <span>9 - Appropriate</span>
              </div>
              {errors.appropriateness_score && (
                <p className="mt-2 text-sm text-red-600">{errors.appropriateness_score}</p>
              )}
            </div>

            {/* Surgery/Fusion Indicated */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Surgery Indicated?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => canEdit && updateFormData('surgery_indicated', true)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      formData.surgery_indicated
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => canEdit && updateFormData('surgery_indicated', false)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      !formData.surgery_indicated
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fusion Indicated?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => canEdit && updateFormData('fusion_indicated', true)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      formData.fusion_indicated
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => canEdit && updateFormData('fusion_indicated', false)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      !formData.fusion_indicated
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Preferred Approach */}
            <div className="mb-6">
              <Select
                label="Preferred Approach"
                options={PREFERRED_APPROACH_OPTIONS}
                value={formData.preferred_approach}
                onChange={(e) => updateFormData('preferred_approach', e.target.value as PreferredApproach)}
                disabled={!canEdit}
                error={errors.preferred_approach}
              />
            </div>

            {/* Outcome Questions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Successful Outcome Likely?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => canEdit && updateFormData('successful_outcome_likely', true)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      formData.successful_outcome_likely
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => canEdit && updateFormData('successful_outcome_likely', false)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      !formData.successful_outcome_likely
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Optimization Recommended?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => canEdit && updateFormData('optimization_recommended', true)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      formData.optimization_recommended
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => canEdit && updateFormData('optimization_recommended', false)}
                    disabled={!canEdit}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium text-sm transition-colors',
                      !formData.optimization_recommended
                        ? 'bg-slate-200 text-slate-700 border-2 border-slate-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Missing Data Flag */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.missing_data_flag}
                  onChange={(e) => canEdit && updateFormData('missing_data_flag', e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">Missing Data Flag</span>
              </label>
              {formData.missing_data_flag && (
                <div className="mt-3">
                  <textarea
                    value={formData.missing_data_description}
                    onChange={(e) => updateFormData('missing_data_description', e.target.value)}
                    placeholder="Describe what data is missing..."
                    rows={3}
                    disabled={!canEdit}
                    className={clsx(
                      'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors',
                      'focus:outline-none focus:ring-2',
                      errors.missing_data_description
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20',
                      !canEdit && 'bg-slate-50'
                    )}
                  />
                  {errors.missing_data_description && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.missing_data_description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => updateFormData('comments', e.target.value)}
                placeholder="Additional comments, recommendations, or concerns..."
                rows={4}
                disabled={!canEdit}
                className={clsx(
                  'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors',
                  'focus:outline-none focus:ring-2 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20',
                  !canEdit && 'bg-slate-50'
                )}
              />
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.submit}
              </div>
            )}

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isSubmitting}
                  isLoading={isSaving}
                >
                  Save Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving || isSubmitting}
                  isLoading={isSubmitting}
                >
                  Submit Review
                </Button>
              </div>
            )}
          </Card>

          {/* Scoring Guide */}
          <Card>
            <CardHeader>Scoring Guide</CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  7-9
                </div>
                <div>
                  <p className="font-medium text-green-800">Appropriate</p>
                  <p className="text-green-700 text-xs">Procedure is appropriate for clinical indications</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  4-6
                </div>
                <div>
                  <p className="font-medium text-amber-800">Uncertain</p>
                  <p className="text-amber-700 text-xs">May be appropriate depending on circumstances</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  1-3
                </div>
                <div>
                  <p className="font-medium text-red-800">Inappropriate</p>
                  <p className="text-red-700 text-xs">Procedure is not appropriate for this scenario</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatLegVsBack(value?: string): string {
  switch (value) {
    case 'leg_dominant': return 'Leg Dominant';
    case 'back_dominant': return 'Back Dominant';
    case 'equal': return 'Equal';
    default: return '—';
  }
}

function formatNeuroDeficit(key: string): string {
  switch (key) {
    case 'motor_weakness': return 'Motor Weakness';
    case 'sensory_loss': return 'Sensory Loss';
    case 'gait_instability': return 'Gait Instability';
    case 'bowel_bladder': return 'Bowel/Bladder';
    default: return key.replace(/_/g, ' ');
  }
}

function formatComorbidities(comorbidities: Comorbidities): string[] {
  const items: string[] = [];
  if (comorbidities.diabetes) items.push('Diabetes');
  if (comorbidities.smoker) items.push('Smoker');
  if (comorbidities.obesity) items.push('Obesity');
  if (comorbidities.heart_disease) items.push('Heart Disease');
  if (comorbidities.osteoporosis) items.push('Osteoporosis');
  if (comorbidities.other) items.push(comorbidities.other);
  return items;
}

function formatConservativeCare(care: ConservativeCare): string[] {
  const items: string[] = [];
  if (care.pt_tried) items.push('Physical Therapy');
  if (care.meds) items.push('Medications');
  if (care.injections) items.push('Injections');
  return items;
}

