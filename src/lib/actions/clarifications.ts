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
  agree_justification: boolean | null;
  justification_comment: string | null;
  agree_overall_plan_acceptable: boolean | null;
  would_personally_prescribe: boolean | null;
  preferred_procedure_text: string | null;
  agree_need_any_surgery_now: boolean | null;
  benefit_from_more_nonsurgical_first: boolean | null;
  proposed_nonsurgical_therapies_text: string | null;
  agree_decompression_plan_acceptable: boolean | null;
  agree_need_any_decompression_now: boolean | null;
  suggested_decompression_text: string | null;
  agree_fusion_plan_acceptable: boolean | null;
  agree_need_any_fusion_now: boolean | null;
  suggested_fusion_text: string | null;
  final_comments: string | null;
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
      agree_justification,
      justification_comment,
      agree_overall_plan_acceptable,
      would_personally_prescribe,
      preferred_procedure_text,
      agree_need_any_surgery_now,
      benefit_from_more_nonsurgical_first,
      proposed_nonsurgical_therapies_text,
      agree_decompression_plan_acceptable,
      agree_need_any_decompression_now,
      suggested_decompression_text,
      agree_fusion_plan_acceptable,
      agree_need_any_fusion_now,
      suggested_fusion_text,
      final_comments
    `)
    .eq('id', reviewId)
    .single();

  if (reviewError || !reviewData) {
    return { success: false, error: 'Review not found' };
  }

  const review = reviewData as ReviewForClarification;

  // Generate contextual questions based on review content
  const questions: string[] = [];
  const addQuestion = (text: string) => {
    if (!questions.includes(text)) {
      questions.push(text);
    }
  };

  // Check for potential clarification points
  if (typeof review.appropriateness_score === 'number' && review.appropriateness_score <= 4) {
    addQuestion(
      `You rated this case ${review.appropriateness_score}/9, suggesting uncertainty or inappropriateness. What specific clinical factors led to that score?`
    );
  }

  if (
    typeof review.appropriateness_score === 'number' &&
    review.appropriateness_score >= 7 &&
    review.agree_overall_plan_acceptable === false
  ) {
    addQuestion(
      `You provided a high appropriateness score (${review.appropriateness_score}/9) but marked the overall plan as unacceptable. Can you walk through that nuance?`
    );
  }

  if (review.agree_justification === false && review.justification_comment) {
    addQuestion(
      `You disagreed with the clinical justification and noted: "${review.justification_comment}". What additional context would help the submitting physician act on this feedback?`
    );
  }

  if (review.agree_overall_plan_acceptable === false) {
    if (review.agree_need_any_surgery_now === true) {
      addQuestion(
        'You indicated the overall plan is unacceptable but that surgery is still needed now. What changes would make the surgical plan acceptable?'
      );
    } else if (review.benefit_from_more_nonsurgical_first === true) {
      addQuestion(
        review.proposed_nonsurgical_therapies_text
          ? `You suggested more nonsurgical care first (${review.proposed_nonsurgical_therapies_text}). What outcome would convince you surgery is warranted?`
          : 'You suggested more nonsurgical care first. What outcome would convince you surgery is warranted?'
      );
    }
  } else if (review.would_personally_prescribe === false && review.preferred_procedure_text) {
    addQuestion(
      `You would not personally prescribe the proposed plan and noted: "${review.preferred_procedure_text}". What makes this approach preferable in this case?`
    );
  }

  if (review.agree_decompression_plan_acceptable === false && review.agree_need_any_decompression_now === true) {
    addQuestion(
      review.suggested_decompression_text
        ? `You suggested an alternative decompression (${review.suggested_decompression_text}). What clinical factors drove that recommendation?`
        : 'You indicated decompression is still needed now but the plan is unacceptable. What clinical factors drive your recommendation?'
    );
  }

  if (review.agree_fusion_plan_acceptable === false && review.agree_need_any_fusion_now === true) {
    addQuestion(
      review.suggested_fusion_text
        ? `You suggested an alternative fusion plan (${review.suggested_fusion_text}). What makes that approach a better fit?`
        : 'You indicated fusion is still needed now but the plan is unacceptable. What changes would you recommend?'
    );
  }

  if (review.final_comments) {
    const excerpt = review.final_comments.length > 180 ? `${review.final_comments.slice(0, 177)}...` : review.final_comments;
    addQuestion(
      `In your review you noted: "${excerpt}". Is there additional context you can provide to help the submitting physician act on that feedback?`
    );
  }

  // Always add a general question if we have few specific ones
  if (questions.length < 2) {
    addQuestion(
      'Are there any additional clinical considerations or recommendations you would like to share with the submitting physician?'
    );
  }

  // Store the initial questions in the database
  const messagesToInsert = questions.map((question) => ({
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
