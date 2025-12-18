import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Case, CaseResult, Review } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface CaseResultPageProps {
  params: Promise<{ caseId: string }>;
}

export default async function CaseResultPage({ params }: CaseResultPageProps) {
  const { caseId } = await params;
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

  // Fetch the case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Case Not Found</h1>
          <p className="mt-2 text-slate-600">The case you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/cases" className="mt-4">
            <Button variant="secondary">Back to Cases</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const caseItem = caseData as Case;

  // Access control
  const canView =
    profile.role === 'SYS_ADMIN' ||
    (profile.role === 'ORG_ADMIN' && caseItem.org_id === profile.org_id) ||
    (profile.role === 'CLINICIAN' && caseItem.submitter_id === profile.id);

  // For expert reviewers, check if they reviewed this case
  if (profile.role === 'EXPERT_REVIEWER') {
    const { data: reviewCheck } = await supabase
      .from('reviews')
      .select('id')
      .eq('case_id', caseId)
      .eq('reviewer_id', profile.id)
      .single();

    if (!reviewCheck && caseItem.submitter_id !== profile.id) {
      return (
        <AppLayout user={{ profile, organization }}>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
            <p className="mt-2 text-slate-600">You don&apos;t have permission to view this result.</p>
            <Link href="/reviews" className="mt-4">
              <Button variant="secondary">Go to Reviews</Button>
            </Link>
          </div>
        </AppLayout>
      );
    }
  }

  if (!canView && profile.role !== 'EXPERT_REVIEWER') {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-600">You don&apos;t have permission to view this result.</p>
          <Link href="/cases" className="mt-4">
            <Button variant="secondary">Back to Cases</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Fetch case result
  const { data: caseResultData, error: resultError } = await supabase
    .from('case_results')
    .select('*')
    .eq('case_id', caseId)
    .single();

  if (resultError || !caseResultData) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Result Not Available</h1>
          <p className="mt-2 text-slate-600">The result for this case is not yet available.</p>
          <Link href={`/cases/${caseId}`} className="mt-4">
            <Button variant="secondary">Back to Case</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const caseResult = caseResultData as CaseResult;

  // Fetch submitted reviews (anonymized)
  const { data: reviews } = await supabase
    .from('reviews')
    .select('appropriateness_score, surgery_indicated, fusion_indicated, preferred_approach, comments')
    .eq('case_id', caseId)
    .eq('status', 'SUBMITTED');

  const submittedReviews = (reviews || []) as Pick<Review, 'appropriateness_score' | 'surgery_indicated' | 'fusion_indicated' | 'preferred_approach' | 'comments'>[];

  // Color classes for final class
  const finalClassStyles = {
    APPROPRIATE: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
      badge: 'bg-green-500',
    },
    UNCERTAIN: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-300',
      badge: 'bg-amber-500',
    },
    INAPPROPRIATE: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
      badge: 'bg-red-500',
    },
  };

  const styles = finalClassStyles[caseResult.final_class as keyof typeof finalClassStyles];

  return (
    <AppLayout user={{ profile, organization }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/cases/${caseId}`}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Case Result</h1>
            <p className="text-slate-600 text-sm font-mono">{caseId}</p>
          </div>
        </div>

        {/* Result Hero */}
        <Card className={`mb-6 ${styles.bg} ${styles.border}`}>
          <div className="text-center py-4">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${styles.badge} flex items-center justify-center`}>
              {caseResult.final_class === 'APPROPRIATE' ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : caseResult.final_class === 'UNCERTAIN' ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className={`text-3xl font-bold ${styles.text}`}>{caseResult.final_class}</h2>
            <p className="text-slate-600 mt-2">Appropriateness Classification</p>
          </div>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <p className="text-sm text-slate-500">Mean Score</p>
            <p className="text-3xl font-bold text-slate-900">{caseResult.mean_score?.toFixed(1)}</p>
            <p className="text-xs text-slate-400">out of 9</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-slate-500">Std. Deviation</p>
            <p className="text-3xl font-bold text-slate-900">{caseResult.score_std_dev?.toFixed(2)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-slate-500">Reviews</p>
            <p className="text-3xl font-bold text-slate-900">{caseResult.num_reviews}</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-slate-500">Agreed w/ Proposed</p>
            <p className="text-3xl font-bold text-slate-900">{caseResult.percent_agreed_with_proposed?.toFixed(0)}%</p>
          </Card>
        </div>

        {/* Case Info */}
        <Card className="mb-6">
          <CardHeader>Case Information</CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Patient ID</p>
              <p className="font-medium">{caseItem.patient_pseudo_id}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Anatomy Region</p>
              <p className="font-medium">{caseItem.anatomy_region}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed At</p>
              <p className="font-medium">{formatDate(caseResult.generated_at)}</p>
            </div>
          </div>
        </Card>

        {/* Reviewer Scores (Anonymized) */}
        <Card className="mb-6">
          <CardHeader>Reviewer Scores</CardHeader>
          <p className="text-sm text-slate-500 mb-4">
            Individual reviewer assessments (anonymized)
          </p>
          <div className="space-y-4">
            {submittedReviews.map((review, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-700">Reviewer {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900">{review.appropriateness_score}</span>
                    <span className="text-slate-400">/9</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${review.surgery_indicated ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-slate-600">
                      Surgery {review.surgery_indicated ? 'Indicated' : 'Not Indicated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${review.fusion_indicated ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-slate-600">
                      Fusion {review.fusion_indicated ? 'Indicated' : 'Not Indicated'}
                    </span>
                  </div>
                  {review.preferred_approach && (
                    <div>
                      <span className="text-slate-500">Approach: </span>
                      <span className="text-slate-700">{formatApproach(review.preferred_approach)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Reviewer Comments (Anonymized) */}
        {submittedReviews.some(r => r.comments) && (
          <Card className="mb-6">
            <CardHeader>Reviewer Comments</CardHeader>
            <div className="space-y-4">
              {submittedReviews
                .filter(r => r.comments)
                .map((review, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-2">Reviewer {index + 1}</p>
                    <p className="text-slate-700">{review.comments}</p>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Classification Guide */}
        <Card>
          <CardHeader>Appropriateness Classification Guide</CardHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-3 h-3 mt-1 rounded-full bg-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">APPROPRIATE (Score ≥ 7)</p>
                <p className="text-green-700">The procedure is generally considered appropriate for this clinical scenario.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="w-3 h-3 mt-1 rounded-full bg-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">UNCERTAIN (Score 4-6)</p>
                <p className="text-amber-700">The appropriateness is uncertain; clinical judgment should be applied.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <div className="w-3 h-3 mt-1 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">INAPPROPRIATE (Score &lt; 4)</p>
                <p className="text-red-700">The procedure is generally considered inappropriate for this clinical scenario.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function formatApproach(approach: string): string {
  switch (approach) {
    case 'DECOMPRESSION_ONLY':
      return 'Decompression Only';
    case 'PLF':
      return 'PLF';
    case 'TLIF':
      return 'TLIF';
    case 'ALIF':
      return 'ALIF';
    case 'OTHER':
      return 'Other';
    default:
      return approach;
  }
}

