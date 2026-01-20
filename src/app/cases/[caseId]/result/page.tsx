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

  // Fetch submitted reviews with reviewer information
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      appropriateness_score, 
      surgery_indicated, 
      fusion_indicated, 
      preferred_approach, 
      successful_outcome_likely,
      optimization_recommended,
      missing_data_flag,
      missing_data_description,
      comments,
      created_at,
      updated_at,
      reviewer:profiles!reviewer_id(id, name, email, specialties)
    `)
    .eq('case_id', caseId)
    .eq('status', 'SUBMITTED')
    .order('created_at', { ascending: true });

  const submittedReviews = (reviews || []) as Array<Pick<Review, 'id' | 'appropriateness_score' | 'surgery_indicated' | 'fusion_indicated' | 'preferred_approach' | 'successful_outcome_likely' | 'optimization_recommended' | 'missing_data_flag' | 'missing_data_description' | 'comments' | 'created_at' | 'updated_at'> & {
    reviewer?: { id: string; name: string; email: string; specialties: string[] } | null;
  }>;

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

        {/* Individual Expert Reviews */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#0E1A26]">Individual Expert Reviews</h3>
                <p className="text-sm text-[#3A4754] mt-1">
                  Detailed assessments from {submittedReviews.length} expert reviewers
                </p>
              </div>
              <Badge variant="success" size="lg">
                {submittedReviews.length} Completed
              </Badge>
            </div>
          </CardHeader>
          <div className="space-y-6">
            {submittedReviews.map((review, index) => (
              <div key={review.id || index} className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-all duration-200">
                {/* Reviewer Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2FA4A9] to-[#1ECAD3] flex items-center justify-center text-white font-semibold text-lg">
                      {review.reviewer?.name?.charAt(0) || 'R'}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0E1A26]">
                        {review.reviewer?.name || `Reviewer ${index + 1}`}
                      </p>
                      {review.reviewer?.specialties && review.reviewer.specialties.length > 0 && (
                        <p className="text-sm text-[#3A4754]">{review.reviewer.specialties[0]}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">
                        Reviewed {formatDate(review.updated_at || review.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold text-[#2FA4A9]">{review.appropriateness_score}</span>
                      <span className="text-lg text-slate-400">/9</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {review.appropriateness_score && review.appropriateness_score >= 7
                        ? 'Appropriate'
                        : review.appropriateness_score && review.appropriateness_score >= 4
                        ? 'Uncertain'
                        : 'Inappropriate'}
                    </p>
                  </div>
                </div>

                {/* Assessment Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${review.surgery_indicated ? 'bg-green-100' : 'bg-red-100'}`}>
                      <svg className={`w-5 h-5 ${review.surgery_indicated ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {review.surgery_indicated ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Surgery Indicated</p>
                      <p className={`font-semibold ${review.surgery_indicated ? 'text-green-700' : 'text-red-700'}`}>
                        {review.surgery_indicated ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${review.fusion_indicated ? 'bg-green-100' : 'bg-red-100'}`}>
                      <svg className={`w-5 h-5 ${review.fusion_indicated ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {review.fusion_indicated ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fusion Indicated</p>
                      <p className={`font-semibold ${review.fusion_indicated ? 'text-green-700' : 'text-red-700'}`}>
                        {review.fusion_indicated ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {review.preferred_approach && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-[#4A6FA5]/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#4A6FA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Preferred Approach</p>
                        <p className="font-semibold text-[#0E1A26]">{formatApproach(review.preferred_approach)}</p>
                      </div>
                    </div>
                  )}

                  {review.successful_outcome_likely !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${review.successful_outcome_likely ? 'bg-green-100' : 'bg-amber-100'}`}>
                        <svg className={`w-5 h-5 ${review.successful_outcome_likely ? 'text-green-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Successful Outcome</p>
                        <p className={`font-semibold ${review.successful_outcome_likely ? 'text-green-700' : 'text-amber-700'}`}>
                          {review.successful_outcome_likely ? 'Likely' : 'Uncertain'}
                        </p>
                      </div>
                    </div>
                  )}

                  {review.optimization_recommended !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${review.optimization_recommended ? 'bg-amber-100' : 'bg-green-100'}`}>
                        <svg className={`w-5 h-5 ${review.optimization_recommended ? 'text-amber-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Optimization</p>
                        <p className={`font-semibold ${review.optimization_recommended ? 'text-amber-700' : 'text-green-700'}`}>
                          {review.optimization_recommended ? 'Recommended' : 'Not Needed'}
                        </p>
                      </div>
                    </div>
                  )}

                  {review.missing_data_flag && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-md border border-amber-200">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Missing Data Noted</p>
                        {review.missing_data_description && (
                          <p className="text-sm text-amber-700 mt-1">{review.missing_data_description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments */}
                {review.comments && (
                  <div className="mt-4 p-4 bg-white rounded-md border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Clinical Comments</p>
                    <p className="text-[#3A4754] leading-relaxed">{review.comments}</p>
                  </div>
                )}

                {/* View Discussion Link */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Link 
                    href={`/reviews/${review.id}/clarify`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#2FA4A9] hover:text-[#1ECAD3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    View Clarification Discussion
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>


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

