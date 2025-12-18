'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PreferredApproach, Review, ReviewStatus, FinalClass } from '@/types/database';

// Helper type for review query results
type ReviewQueryResult = Pick<Review, 'id' | 'reviewer_id' | 'status' | 'case_id'>;

export interface ReviewFormData {
  surgery_indicated: boolean;
  fusion_indicated: boolean;
  preferred_approach: PreferredApproach;
  appropriateness_score: number;
  successful_outcome_likely: boolean;
  optimization_recommended: boolean;
  missing_data_flag: boolean;
  missing_data_description: string;
  comments: string;
}

export async function saveReviewDraft(
  reviewId: string,
  formData: Partial<ReviewFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify review ownership and status
  const { data: reviewRaw, error: reviewError } = await supabase
    .from('reviews')
    .select('id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (reviewError || !reviewRaw) {
    return { success: false, error: 'Review not found' };
  }

  const review = reviewRaw as ReviewQueryResult;

  if (review.reviewer_id !== user.id) {
    return { success: false, error: 'Not authorized to update this review' };
  }

  if (review.status === 'SUBMITTED') {
    return { success: false, error: 'Cannot modify a submitted review' };
  }

  // Update review
  const updateData: Record<string, unknown> = {
    ...formData,
    status: 'IN_PROGRESS' as ReviewStatus,
  };

  const { error: updateError } = await supabase
    .from('reviews')
    .update(updateData as never)
    .eq('id', reviewId);

  if (updateError) {
    console.error('Error updating review:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);

  return { success: true };
}

export async function submitReview(
  reviewId: string,
  formData: ReviewFormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify review ownership and status
  const { data: reviewRaw2, error: reviewError } = await supabase
    .from('reviews')
    .select('id, case_id, reviewer_id, status')
    .eq('id', reviewId)
    .single();

  if (reviewError || !reviewRaw2) {
    return { success: false, error: 'Review not found' };
  }

  const review = reviewRaw2 as ReviewQueryResult;

  if (review.reviewer_id !== user.id) {
    return { success: false, error: 'Not authorized to submit this review' };
  }

  if (review.status === 'SUBMITTED') {
    return { success: false, error: 'Review already submitted' };
  }

  // Validate required fields
  if (!formData.appropriateness_score || formData.appropriateness_score < 1 || formData.appropriateness_score > 9) {
    return { success: false, error: 'Appropriateness score (1-9) is required' };
  }

  if (formData.surgery_indicated === undefined) {
    return { success: false, error: 'Surgery indicated is required' };
  }

  if (formData.fusion_indicated === undefined) {
    return { success: false, error: 'Fusion indicated is required' };
  }

  if (formData.missing_data_flag && !formData.missing_data_description?.trim()) {
    return { success: false, error: 'Please describe the missing data' };
  }

  // Get user profile for audit log
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, org_id')
    .eq('id', user.id)
    .single();

  // Update review to submitted
  const { error: updateError } = await supabase
    .from('reviews')
    .update({
      ...formData,
      status: 'SUBMITTED' as ReviewStatus,
    } as never)
    .eq('id', reviewId);

  if (updateError) {
    console.error('Error submitting review:', updateError);
    return { success: false, error: updateError.message };
  }

  // Create audit log
  await supabase.from('audit_logs').insert({
    actor_user_id: user.id,
    org_id: (profile as { id: string; org_id: string } | null)?.org_id,
    action_type: 'REVIEW_SUBMITTED',
    target_type: 'REVIEW',
    target_id: reviewId,
    metadata: { case_id: review.case_id },
  } as never);

  // Trigger result aggregation
  await aggregateCaseResults(review.case_id);

  revalidatePath('/reviews');
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/cases/${review.case_id}`);

  return { success: true };
}

// ============================================
// RESULT AGGREGATION LOGIC
// ============================================

export async function aggregateCaseResults(caseId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if result already exists
  const { data: existingResult } = await supabase
    .from('case_results')
    .select('id')
    .eq('case_id', caseId)
    .single();

  if (existingResult) {
    // Result already exists, skip
    return { success: true };
  }

  // Fetch all submitted reviews
  type ReviewAggData = { appropriateness_score: number | null; surgery_indicated: boolean | null; fusion_indicated: boolean | null };
  const { data: reviewsRaw, error: reviewsError } = await supabase
    .from('reviews')
    .select('appropriateness_score, surgery_indicated, fusion_indicated')
    .eq('case_id', caseId)
    .eq('status', 'SUBMITTED');

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    return { success: false, error: 'Failed to fetch reviews' };
  }

  const reviews = (reviewsRaw as ReviewAggData[] | null) || [];

  if (reviews.length < 5) {
    // Not enough reviews yet
    return { success: true };
  }

  // Calculate statistics
  const scores = reviews.map(r => r.appropriateness_score).filter((s): s is number => s !== null);
  const numReviews = scores.length;

  if (numReviews < 5) {
    return { success: true };
  }

  const meanScore = scores.reduce((a, b) => a + b, 0) / numReviews;
  
  // Calculate standard deviation
  const squaredDiffs = scores.map(score => Math.pow(score - meanScore, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numReviews;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Determine final class
  let finalClass: FinalClass;
  if (meanScore >= 7) {
    finalClass = 'APPROPRIATE';
  } else if (meanScore >= 4) {
    finalClass = 'UNCERTAIN';
  } else {
    finalClass = 'INAPPROPRIATE';
  }

  // Calculate agreement percentage
  // "Agreed with proposed" = surgery_indicated AND fusion_indicated
  const agreedCount = reviews.filter(r => r.surgery_indicated === true && r.fusion_indicated === true).length;
  const percentAgreed = (agreedCount / numReviews) * 100;
  const percentAlternative = 100 - percentAgreed;

  // Insert case result
  const { error: insertError } = await supabase.from('case_results').insert({
    case_id: caseId,
    final_class: finalClass,
    mean_score: meanScore,
    score_std_dev: stdDev,
    num_reviews: numReviews,
    percent_agreed_with_proposed: percentAgreed,
    percent_recommended_alternative: percentAlternative,
  } as never);

  if (insertError) {
    console.error('Error inserting case result:', insertError);
    return { success: false, error: 'Failed to create case result' };
  }

  // Update case status to COMPLETED
  const { error: updateError } = await supabase
    .from('cases')
    .update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    } as never)
    .eq('id', caseId);

  if (updateError) {
    console.error('Error updating case status:', updateError);
  }

  // Fetch case for notifications
  type CaseNotifData = { submitter_id: string; org_id: string };
  const { data: caseDataRaw } = await supabase
    .from('cases')
    .select('submitter_id, org_id')
    .eq('id', caseId)
    .single();

  const caseData = caseDataRaw as CaseNotifData | null;

  if (caseData) {
    // Notify submitter
    await supabase.from('notifications').insert({
      user_id: caseData.submitter_id,
      type: 'CASE_RESULT_READY',
      payload: { caseId },
      is_read: false,
    } as never);

    // Notify org admins
    type AdminIdData = { id: string };
    const { data: orgAdminsRaw } = await supabase
      .from('profiles')
      .select('id')
      .eq('org_id', caseData.org_id)
      .eq('role', 'ORG_ADMIN');

    const orgAdmins = (orgAdminsRaw as AdminIdData[] | null) || [];

    if (orgAdmins.length > 0) {
      const notifications = orgAdmins.map(admin => ({
        user_id: admin.id,
        type: 'CASE_RESULT_READY' as const,
        payload: { caseId },
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifications as never);
    }
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/cases/${caseId}/result`);
  revalidatePath('/dashboard');

  return { success: true };
}

