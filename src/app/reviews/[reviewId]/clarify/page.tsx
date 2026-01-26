import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Review } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ClarificationChat } from './_components/ClarificationChat';
import {
  generateClarificationQuestions,
  getClarificationMessages,
} from '@/lib/actions/clarifications';

interface ClarifyPageProps {
  params: Promise<{ reviewId: string }>;
}

export default async function ClarifyPage({ params }: ClarifyPageProps) {
  const { reviewId } = await params;
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = profileData as Profile | null;

  if (profileError || !profile) {
    redirect('/login');
  }

  // Fetch the organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  const organization = orgData as Organization | null;

  if (orgError || !organization) {
    redirect('/login');
  }

  // Fetch the review with related case
  const { data: reviewData, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      *,
      case:cases!case_id(id, submitter_id, org_id)
    `)
    .eq('id', reviewId)
    .maybeSingle();

  if (reviewError || !reviewData) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Review Not Found</h1>
          <p className="mt-2 text-slate-600">The review you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/reviews" className="mt-4">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const review = reviewData as Review & {
    case?: { id: string; submitter_id: string; org_id: string } | null;
  };

  // Determine user role for this view
  const isReviewer = review.reviewer_id === profile.id;
  const isClinician = review.case?.submitter_id === profile.id;
  const isSysAdmin = profile.role === 'SYS_ADMIN';

  if (!isReviewer && !isClinician && !isSysAdmin) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-600">You don&apos;t have permission to view this page.</p>
          <Link href="/reviews" className="mt-4">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Generate clarification questions if this is the reviewer's first time here
  let questions: string[] = [];
  if (isReviewer && review.status === 'SUBMITTED') {
    const result = await generateClarificationQuestions(reviewId);
    if (result.success && result.questions) {
      questions = result.questions;
    }
  }

  // Get existing clarification messages
  const messagesResult = await getClarificationMessages(reviewId);
  const messages = messagesResult.messages || [];

  return (
    <AppLayout user={{ profile, organization }}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href={isReviewer ? '/reviews' : `/cases/${review.case?.id}`} className="text-slate-500 hover:text-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isReviewer ? 'Review Clarification' : 'Reviewer Discussion'}
              </h1>
              <p className="text-slate-600 text-sm">
                {isReviewer 
                  ? 'Add additional context to help the submitting physician'
                  : 'View clarifications and ask follow-up questions'}
              </p>
            </div>
          </div>
        </div>

        <ClarificationChat
          reviewId={reviewId}
          initialMessages={messages}
          initialQuestions={questions}
          review={{
            id: review.id,
            appropriateness_score: review.appropriateness_score,
            agree_overall_plan_acceptable: review.agree_overall_plan_acceptable,
            agree_need_any_surgery_now: review.agree_need_any_surgery_now,
            agree_fusion_plan_acceptable: review.agree_fusion_plan_acceptable,
            agree_need_any_fusion_now: review.agree_need_any_fusion_now,
            would_personally_prescribe: review.would_personally_prescribe,
            preferred_procedure_text: review.preferred_procedure_text,
            proposed_nonsurgical_therapies_text: review.proposed_nonsurgical_therapies_text,
            suggested_decompression_text: review.suggested_decompression_text,
            suggested_fusion_text: review.suggested_fusion_text,
            final_comments: review.final_comments,
          }}
          userRole={isReviewer ? 'REVIEWER' : 'CLINICIAN'}
        />
      </div>
    </AppLayout>
  );
}
