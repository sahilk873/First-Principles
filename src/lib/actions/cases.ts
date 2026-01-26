'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AnatomyRegion, Case, CaseStatus, Profile } from '@/types/database';
import { createEmptyClinicalData, type ClinicalData } from '@/types/clinical';

// Helper type for partial profile
type ProfileWithRoleAndOrg = Pick<Profile, 'id' | 'org_id' | 'role'>;

/** Legacy types for DB columns; also used when reading cases for detail/review. */
export interface SymptomProfile {
  summary?: string;
  duration?: string;
  leg_vs_back?: 'leg_dominant' | 'back_dominant' | 'equal';
  severity?: number;
}

export interface NeuroDeficits {
  motor_weakness: boolean;
  sensory_loss: boolean;
  gait_instability: boolean;
  bowel_bladder: boolean;
}

export interface Comorbidities {
  diabetes: boolean;
  smoker: boolean;
  obesity: boolean;
  heart_disease: boolean;
  osteoporosis: boolean;
  other: string;
}

export interface ConservativeCare {
  pt_tried: boolean;
  meds: boolean;
  injections: boolean;
  duration: string;
}

/** Form data for the 14-section clinical case submission. */
export interface CaseFormData {
  diagnosis_codes: string[];
  proposed_procedure_codes: string[];
  imaging_paths: string[];
  clinical_data: ClinicalData;
}

/** Derive legacy case columns from clinical_data for backward compatibility. */
function mapClinicalDataToLegacy(c: ClinicalData) {
  const s2 = c.section2;
  const s3 = c.section3;
  const s4 = c.section4;
  const s2l = s2.comorbidities_list;

  const legVals = ['leg_dominant', 'back_dominant', 'equal'] as const;
  const leg =
    s2.back_leg_proportionality && legVals.includes(s2.back_leg_proportionality as (typeof legVals)[number])
      ? (s2.back_leg_proportionality as 'leg_dominant' | 'back_dominant' | 'equal')
      : undefined;

  return {
    symptom_profile: {
      summary: [s2.duration, s2.primary_symptom_complex, s2.back_symptoms.symptom_type, s2.leg_symptoms.symptom_type].filter(Boolean).join('; ') || undefined,
      duration: s2.duration || undefined,
      leg_vs_back: leg,
      severity: s2.pain_intensity ? parseInt(s2.pain_intensity, 10) : undefined,
    },
    neuro_deficits: {
      motor_weakness: !!s3.motor_grade,
      sensory_loss: !!s3.sensory,
      gait_instability: !!s3.gait,
      bowel_bladder: !!s3.sphincter,
    },
    prior_surgery: s4.applicable,
    prior_surgery_details: s4.applicable ? [s4.levels_and_procedure, s4.primary_reason_for_revision].filter(Boolean).join('; ') || null : null,
    comorbidities: {
      diabetes: s2.comorbidities_mode === 'following' && s2l.diabetes,
      smoker: s2.comorbidities_mode === 'following' && s2l.smoker,
      obesity: s2.comorbidities_mode === 'following' && s2l.obesity,
      heart_disease: s2.comorbidities_mode === 'following' && s2l.heart_disease,
      osteoporosis: s2.comorbidities_mode === 'following' && s2l.osteoporosis,
      other: s2.comorbidities_mode === 'following' ? s2l.other : '',
    },
    conservative_care: {
      pt_tried: s2.conservative_type_other,
      meds: s2.conservative_type_medical,
      injections: false,
      duration: s2.conservative_duration || '',
    },
    free_text_summary: c.section12.justification || null,
  };
}

function isClinicalDataEmpty(c: ClinicalData): boolean {
  return JSON.stringify(c) === JSON.stringify(createEmptyClinicalData());
}

export async function submitCase(
  formData: CaseFormData,
  isDraft: boolean = false
): Promise<{ success: boolean; caseId?: string; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single();

  const profile = profileData as ProfileWithRoleAndOrg | null;

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check if user can create cases
  if (profile.role !== 'CLINICIAN' && profile.role !== 'ORG_ADMIN' && profile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Not authorized to create cases' };
  }

  const s1 = formData.clinical_data.section1;
  const legacy = mapClinicalDataToLegacy(formData.clinical_data);

  // Prepare case data
  const caseData = {
    org_id: profile.org_id,
    submitter_id: profile.id,
    status: (isDraft ? 'DRAFT' : 'SUBMITTED') as CaseStatus,
    patient_pseudo_id: s1.case_number || 'TBD',
    anatomy_region: s1.anatomy_region as AnatomyRegion,
    diagnosis_codes: formData.diagnosis_codes,
    proposed_procedure_codes: formData.proposed_procedure_codes,
    symptom_profile: legacy.symptom_profile,
    neuro_deficits: legacy.neuro_deficits,
    prior_surgery: legacy.prior_surgery,
    prior_surgery_details: legacy.prior_surgery_details,
    comorbidities: legacy.comorbidities,
    conservative_care: legacy.conservative_care,
    free_text_summary: legacy.free_text_summary,
    imaging_paths: formData.imaging_paths,
    clinical_data: formData.clinical_data,
    submitted_at: isDraft ? null : new Date().toISOString(),
  };

  // Insert the case
  const { data: newCaseData, error: insertError } = await supabase
    .from('cases')
    .insert(caseData as never)
    .select('id')
    .single();

  const newCase = newCaseData as { id: string } | null;

  if (insertError) {
    console.error('Error inserting case:', insertError);
    return { success: false, error: insertError.message };
  }

  // If submitted (not draft), assign reviewers
  if (!isDraft && newCase) {
    const assignResult = await assignReviewersToCase(newCase.id);
    if (!assignResult.success) {
      console.error('Error assigning reviewers:', assignResult.error);
      // Case is still created, but reviewers weren't assigned
      // We'll update the status anyway
    }
  }

  // Revalidate the cases page
  revalidatePath('/cases');
  revalidatePath('/dashboard');

  return { success: true, caseId: newCase?.id };
}

export async function updateCase(
  caseId: string,
  formData: CaseFormData,
  isDraft: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single();

  const profile = profileData as ProfileWithRoleAndOrg | null;

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check that the case exists and belongs to this user
  const { data: existingCaseData, error: caseError } = await supabase
    .from('cases')
    .select('id, submitter_id, status, clinical_data')
    .eq('id', caseId)
    .single();

  const existingCase = existingCaseData as {
    id: string;
    submitter_id: string;
    status: CaseStatus;
    clinical_data: ClinicalData | null;
  } | null;

  if (caseError || !existingCase) {
    return { success: false, error: 'Case not found' };
  }

  if (existingCase.submitter_id !== profile.id) {
    return { success: false, error: 'Not authorized to update this case' };
  }

  if (existingCase.status !== 'DRAFT') {
    return { success: false, error: 'Can only update draft cases' };
  }

  const s1 = formData.clinical_data.section1;
  const legacy = mapClinicalDataToLegacy(formData.clinical_data);
  const shouldUpdateLegacy = !!existingCase?.clinical_data || !isClinicalDataEmpty(formData.clinical_data);

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: (isDraft ? 'DRAFT' : 'SUBMITTED') as CaseStatus,
    diagnosis_codes: formData.diagnosis_codes,
    proposed_procedure_codes: formData.proposed_procedure_codes,
    imaging_paths: formData.imaging_paths,
    clinical_data: formData.clinical_data,
    submitted_at: isDraft ? null : new Date().toISOString(),
  };
  if (shouldUpdateLegacy) {
    updateData.patient_pseudo_id = s1.case_number || 'TBD';
    updateData.anatomy_region = s1.anatomy_region as AnatomyRegion;
    updateData.symptom_profile = legacy.symptom_profile;
    updateData.neuro_deficits = legacy.neuro_deficits;
    updateData.prior_surgery = legacy.prior_surgery;
    updateData.prior_surgery_details = legacy.prior_surgery_details;
    updateData.comorbidities = legacy.comorbidities;
    updateData.conservative_care = legacy.conservative_care;
    updateData.free_text_summary = legacy.free_text_summary;
  }

  // Update the case
  const { error: updateError } = await supabase
    .from('cases')
    .update(updateData as never)
    .eq('id', caseId);

  if (updateError) {
    console.error('Error updating case:', updateError);
    return { success: false, error: updateError.message };
  }

  // If submitted (not draft), assign reviewers
  if (!isDraft) {
    const assignResult = await assignReviewersToCase(caseId);
    if (!assignResult.success) {
      console.error('Error assigning reviewers:', assignResult.error);
    }
  }

  // Revalidate
  revalidatePath('/cases');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');

  return { success: true };
}

// ============================================
// STEP 4: REVIEW ASSIGNMENT LOGIC
// ============================================

export async function assignReviewersToCase(
  caseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch the case
  const { data: caseDataRaw, error: caseError } = await supabase
    .from('cases')
    .select('id, org_id, status')
    .eq('id', caseId)
    .single();

  if (caseError || !caseDataRaw) {
    return { success: false, error: 'Case not found' };
  }

  const caseData = caseDataRaw as Pick<Case, 'id' | 'org_id' | 'status'>;

  // Check if reviewers are already assigned
  const { count: existingReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('case_id', caseId);

  if (existingReviews && existingReviews > 0) {
    // Reviewers already assigned, skip
    return { success: true };
  }

  // Find expert reviewers
  // Prefer reviewers from different organizations
  type ExpertProfile = { id: string; org_id: string };
  const { data: expertsRaw, error: expertsError } = await supabase
    .from('profiles')
    .select('id, org_id')
    .eq('role', 'EXPERT_REVIEWER')
    .eq('is_expert_certified', true)
    .neq('org_id', caseData.org_id)
    .limit(10);

  let experts = (expertsRaw as ExpertProfile[] | null) || [];

  // If not enough experts from other orgs, include all
  if (experts.length < 5) {
    const { data: allExpertsRaw, error: allExpertsError } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('role', 'EXPERT_REVIEWER')
      .eq('is_expert_certified', true)
      .limit(10);

    if (allExpertsError) {
      console.error('Error fetching experts:', allExpertsError);
      return { success: false, error: 'Failed to fetch expert reviewers' };
    }
    experts = (allExpertsRaw as ExpertProfile[] | null) || [];
  }

  if (!experts || experts.length === 0) {
    // No experts available - still mark as submitted
    return { success: true };
  }

  // Shuffle and select up to 5 reviewers
  const shuffled = experts.sort(() => Math.random() - 0.5);
  const selectedExperts = shuffled.slice(0, 5);

  // Create review assignments
  const reviewsToInsert = selectedExperts.map((expert) => ({
    case_id: caseId,
    reviewer_id: expert.id,
    status: 'ASSIGNED' as const,
  }));

  const { error: reviewInsertError } = await supabase
    .from('reviews')
    .insert(reviewsToInsert as never);

  if (reviewInsertError) {
    console.error('Error inserting reviews:', reviewInsertError);
    return { success: false, error: 'Failed to assign reviewers' };
  }

  // Create notifications for each reviewer
  const notificationsToInsert = selectedExperts.map((expert) => ({
    user_id: expert.id,
    type: 'CASE_ASSIGNED' as const,
    payload: { caseId },
    is_read: false,
  }));

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notificationsToInsert as never);

  if (notifError) {
    console.error('Error creating notifications:', notifError);
    // Non-critical error, continue
  }

  // Update case status to UNDER_REVIEW
  const { error: statusError } = await supabase
    .from('cases')
    .update({ status: 'UNDER_REVIEW' } as never)
    .eq('id', caseId);

  if (statusError) {
    console.error('Error updating case status:', statusError);
    return { success: false, error: 'Failed to update case status' };
  }

  return { success: true };
}
