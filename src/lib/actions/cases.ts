'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AnatomyRegion, Case, CaseStatus, Profile } from '@/types/database';

// Helper type for partial profile
type ProfileWithRoleAndOrg = Pick<Profile, 'id' | 'org_id' | 'role'>;

// Types for case form data
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

export interface CaseFormData {
  // Step 1 - Basic Info
  patient_pseudo_id: string;
  anatomy_region: AnatomyRegion;
  symptom_summary: string;

  // Step 2 - Clinical Details
  symptom_profile: SymptomProfile;
  neuro_deficits: NeuroDeficits;
  prior_surgery: boolean;
  prior_surgery_details: string;
  comorbidities: Comorbidities;
  conservative_care: ConservativeCare;

  // Step 3 - Proposed Procedure
  diagnosis_codes: string[];
  proposed_procedure_codes: string[];
  free_text_summary: string;

  // Step 4 - Imaging
  imaging_paths: string[];
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

  // Build symptom_profile JSON
  const symptomProfile = {
    summary: formData.symptom_summary,
    duration: formData.symptom_profile.duration,
    leg_vs_back: formData.symptom_profile.leg_vs_back,
    severity: formData.symptom_profile.severity,
  };

  // Prepare case data
  const caseData = {
    org_id: profile.org_id,
    submitter_id: profile.id,
    status: (isDraft ? 'DRAFT' : 'SUBMITTED') as CaseStatus,
    patient_pseudo_id: formData.patient_pseudo_id,
    anatomy_region: formData.anatomy_region,
    diagnosis_codes: formData.diagnosis_codes,
    proposed_procedure_codes: formData.proposed_procedure_codes,
    symptom_profile: symptomProfile,
    neuro_deficits: formData.neuro_deficits,
    prior_surgery: formData.prior_surgery,
    prior_surgery_details: formData.prior_surgery ? formData.prior_surgery_details : null,
    comorbidities: formData.comorbidities,
    conservative_care: formData.conservative_care,
    free_text_summary: formData.free_text_summary,
    imaging_paths: formData.imaging_paths,
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
    .select('id, submitter_id, status')
    .eq('id', caseId)
    .single();

  const existingCase = existingCaseData as { id: string; submitter_id: string; status: CaseStatus } | null;

  if (caseError || !existingCase) {
    return { success: false, error: 'Case not found' };
  }

  if (existingCase.submitter_id !== profile.id) {
    return { success: false, error: 'Not authorized to update this case' };
  }

  if (existingCase.status !== 'DRAFT') {
    return { success: false, error: 'Can only update draft cases' };
  }

  // Build symptom_profile JSON
  const symptomProfile = {
    summary: formData.symptom_summary,
    duration: formData.symptom_profile.duration,
    leg_vs_back: formData.symptom_profile.leg_vs_back,
    severity: formData.symptom_profile.severity,
  };

  // Prepare update data
  const updateData = {
    status: (isDraft ? 'DRAFT' : 'SUBMITTED') as CaseStatus,
    patient_pseudo_id: formData.patient_pseudo_id,
    anatomy_region: formData.anatomy_region,
    diagnosis_codes: formData.diagnosis_codes,
    proposed_procedure_codes: formData.proposed_procedure_codes,
    symptom_profile: symptomProfile,
    neuro_deficits: formData.neuro_deficits,
    prior_surgery: formData.prior_surgery,
    prior_surgery_details: formData.prior_surgery ? formData.prior_surgery_details : null,
    comorbidities: formData.comorbidities,
    conservative_care: formData.conservative_care,
    free_text_summary: formData.free_text_summary,
    imaging_paths: formData.imaging_paths,
    submitted_at: isDraft ? null : new Date().toISOString(),
  };

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

