'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ClarificationMessage {
  id: string;
  review_id: string;
  sender_type: 'SYSTEM' | 'REVIEWER' | 'CLINICIAN';
  sender_id: string | null;
  message: string;
  message_type: 'QUESTION' | 'ANSWER' | 'INFO';
  created_at: string;
}

export interface ClarificationFormData {
  message: string;
  message_type: 'QUESTION' | 'ANSWER' | 'INFO';
}

// Review data type for clarification generation
interface ReviewForClarification {
  appropriateness_score: number | null;
  surgery_indicated: boolean | null;
  missing_data_flag: boolean | null;
  optimization_recommended: boolean | null;
  successful_outcome_likely: boolean | null;
}

// Generate initial clarification questions based on the review
export async function generateClarificationQuestions(
  reviewId: string
): Promise<{ success: boolean; questions?: string[]; error?: string }> {
  const supabase = await createClient();

  // Fetch the review with case data
  const { data: reviewData, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      appropriateness_score,
      surgery_indicated,
      missing_data_flag,
      optimization_recommended,
      successful_outcome_likely
    `)
    .eq('id', reviewId)
    .single();

  if (reviewError || !reviewData) {
    return { success: false, error: 'Review not found' };
  }

  const review = reviewData as ReviewForClarification;

  // Generate contextual questions based on review content
  const questions: string[] = [];

  // Check for potential clarification points
  if (review.appropriateness_score && review.appropriateness_score <= 4) {
    questions.push(
      'You rated this case as uncertain or inappropriate. Could you elaborate on the primary clinical factors that led to this assessment?'
    );
  }

  if (review.appropriateness_score && review.appropriateness_score >= 7 && !review.surgery_indicated) {
    questions.push(
      'You rated this case as appropriate but indicated surgery may not be indicated. Could you clarify this assessment?'
    );
  }

  if (review.missing_data_flag) {
    questions.push(
      'You flagged missing data for this case. How significantly does the missing information impact your confidence in the assessment?'
    );
  }

  if (review.optimization_recommended) {
    questions.push(
      'You recommended patient optimization before proceeding. What specific optimization measures would you suggest?'
    );
  }

  if (!review.successful_outcome_likely && review.surgery_indicated) {
    questions.push(
      'You indicated surgery is appropriate but a successful outcome may not be likely. What factors contribute to this concern?'
    );
  }

  // Always add a general question if we have few specific ones
  if (questions.length < 2) {
    questions.push(
      'Are there any additional clinical considerations or recommendations you would like to share with the submitting physician?'
    );
  }

  // Store the initial questions in the database
  const messagesToInsert = questions.map((question, index) => ({
    review_id: reviewId,
    sender_type: 'SYSTEM' as const,
    sender_id: null,
    message: question,
    message_type: 'QUESTION' as const,
  }));

  // Check if questions already exist
  const { data: existingMessages } = await supabase
    .from('review_clarifications')
    .select('id')
    .eq('review_id', reviewId)
    .limit(1);

  if (existingMessages && existingMessages.length > 0) {
    // Questions already generated
    return { success: true, questions };
  }

  const { error: insertError } = await supabase
    .from('review_clarifications')
    .insert(messagesToInsert as never);

  if (insertError) {
    console.error('Error inserting clarification questions:', insertError);
    // Return success anyway with the questions - table might not exist yet
    return { success: true, questions };
  }

  return { success: true, questions };
}

// Get all clarification messages for a review
export async function getClarificationMessages(
  reviewId: string
): Promise<{ success: boolean; messages?: ClarificationMessage[]; error?: string }> {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from('review_clarifications')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) {
    // Table might not exist yet
    return { success: true, messages: [] };
  }

  return { success: true, messages: (messages as ClarificationMessage[]) || [] };
}

// Add a new clarification message (response from reviewer)
export async function addClarificationResponse(
  reviewId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is the reviewer
  const { data: reviewData } = await supabase
    .from('reviews')
    .select('reviewer_id, case_id')
    .eq('id', reviewId)
    .single();

  const review = reviewData as { reviewer_id: string; case_id: string } | null;

  if (!review || review.reviewer_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  // Insert the response
  const { error: insertError } = await supabase.from('review_clarifications').insert({
    review_id: reviewId,
    sender_type: 'REVIEWER',
    sender_id: user.id,
    message,
    message_type: 'ANSWER',
  } as never);

  if (insertError) {
    console.error('Error inserting clarification response:', insertError);
    return { success: false, error: 'Failed to save response' };
  }

  // Notify the clinician
  const { data: caseDataRaw } = await supabase
    .from('cases')
    .select('submitter_id')
    .eq('id', review.case_id)
    .single();

  const caseData = caseDataRaw as { submitter_id: string } | null;

  if (caseData) {
    await supabase.from('notifications').insert({
      user_id: caseData.submitter_id,
      type: 'REVIEW_CLARIFICATION',
      payload: { reviewId, caseId: review.case_id },
      is_read: false,
    } as never);
  }

  revalidatePath(`/reviews/${reviewId}/clarify`);
  revalidatePath(`/cases/${review.case_id}`);

  return { success: true };
}

// Mark clarification as complete
export async function completeClarification(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update review to mark clarification as complete
  const { error: updateError } = await supabase
    .from('reviews')
    .update({ clarification_completed: true } as never)
    .eq('id', reviewId)
    .eq('reviewer_id', user.id);

  if (updateError) {
    console.error('Error updating review:', updateError);
    return { success: false, error: 'Failed to complete clarification' };
  }

  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath('/reviews');

  return { success: true };
}

// Add a question from clinician (for follow-up)
export async function addClinicianQuestion(
  reviewId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is the case submitter
  const { data: reviewData2 } = await supabase
    .from('reviews')
    .select('case_id, reviewer_id')
    .eq('id', reviewId)
    .single();

  const review2 = reviewData2 as { case_id: string; reviewer_id: string } | null;

  if (!review2) {
    return { success: false, error: 'Review not found' };
  }

  const { data: caseDataRaw2 } = await supabase
    .from('cases')
    .select('submitter_id')
    .eq('id', review2.case_id)
    .single();

  const caseData2 = caseDataRaw2 as { submitter_id: string } | null;

  if (!caseData2 || caseData2.submitter_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  // Insert the question
  const { error: insertError } = await supabase.from('review_clarifications').insert({
    review_id: reviewId,
    sender_type: 'CLINICIAN',
    sender_id: user.id,
    message,
    message_type: 'QUESTION',
  } as never);

  if (insertError) {
    console.error('Error inserting clinician question:', insertError);
    return { success: false, error: 'Failed to save question' };
  }

  // Notify the reviewer
  await supabase.from('notifications').insert({
    user_id: review2.reviewer_id,
    type: 'CLARIFICATION_REQUEST',
    payload: { reviewId, caseId: review2.case_id },
    is_read: false,
  } as never);

  revalidatePath(`/reviews/${reviewId}/clarify`);
  revalidatePath(`/cases/${review2.case_id}`);

  return { success: true };
}

