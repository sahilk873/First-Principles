import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Review, CaseResult } from '@/types/database';
import { Card, StatCard } from '@/components/ui/Card';

export default async function ReviewerPerformancePage() {
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

  // Only EXPERT_REVIEWER can access this page
  if (profile.role !== 'EXPERT_REVIEWER') {
    redirect('/dashboard');
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

  // Count total submitted reviews
  const { count: totalSubmittedReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', profile.id)
    .eq('status', 'SUBMITTED');

  // Fetch submitted reviews with case_id
  const { data: submittedReviewsData } = await supabase
    .from('reviews')
    .select('id, case_id, appropriateness_score')
    .eq('reviewer_id', profile.id)
    .eq('status', 'SUBMITTED');

  const submittedReviews = (submittedReviewsData || []) as Pick<Review, 'id' | 'case_id' | 'appropriateness_score'>[];

  // Get case IDs from reviews
  const caseIds = [...new Set(submittedReviews.map((r) => r.case_id))];

  // Fetch case_results for these cases
  let casesWithResults = 0;
  let concordantCount = 0;

  if (caseIds.length > 0) {
    const { data: caseResultsData } = await supabase
      .from('case_results')
      .select('case_id, mean_score')
      .in('case_id', caseIds);

    const caseResults = (caseResultsData || []) as Pick<CaseResult, 'case_id' | 'mean_score'>[];
    casesWithResults = caseResults.length;

    // Calculate concordance
    // A review is "concordant" if |reviewer_score - mean_score| <= 1
    for (const result of caseResults) {
      const review = submittedReviews.find((r) => r.case_id === result.case_id);
      if (review && review.appropriateness_score !== null && result.mean_score !== null) {
        const diff = Math.abs(review.appropriateness_score - result.mean_score);
        if (diff <= 1) {
          concordantCount++;
        }
      }
    }
  }

  const concordancePercent =
    casesWithResults > 0 ? Math.round((concordantCount / casesWithResults) * 100) : 0;

  // Get pending reviews count
  const { count: pendingReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', profile.id)
    .in('status', ['ASSIGNED', 'IN_PROGRESS']);

  return (
    <AppLayout user={{ profile, organization }}>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Performance</h1>
          <p className="mt-1 text-slate-600">
            Track your review activity and consensus alignment
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Reviews Submitted"
            value={totalSubmittedReviews || 0}
            color="teal"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="Cases with Results"
            value={casesWithResults}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
          <StatCard
            title="Concordance Rate"
            value={`${concordancePercent}%`}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
          <StatCard
            title="Pending Reviews"
            value={pendingReviews || 0}
            color="amber"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Concordance Explanation */}
        <Card className="mb-8">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Understanding Concordance</h3>
              <p className="mt-1 text-sm text-slate-600">
                Concordance measures how closely your appropriateness scores align with the consensus
                (mean score) from all reviewers. A score is considered &quot;concordant&quot; if your rating
                is within 1 point of the mean score on the 1-9 scale.
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong className="text-blue-600">
                    {concordantCount} of {casesWithResults}
                  </strong>{' '}
                  completed reviews ({concordancePercent}%) were in concordance with the expert panel consensus.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Visual Progress Bar */}
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Concordance Visualization</h3>
          
          {casesWithResults === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-500">
                No completed cases yet. Submit reviews to see your concordance data.
              </p>
            </div>
          ) : (
            <div>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Concordance with Consensus</span>
                  <span className="font-semibold text-slate-900">
                    {concordantCount} / {casesWithResults} cases
                  </span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${concordancePercent}%` }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-800">Concordant</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-green-700">{concordantCount}</p>
                  <p className="text-xs text-green-600">Within 1 point of consensus</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-sm font-medium text-amber-800">Divergent</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {casesWithResults - concordantCount}
                  </p>
                  <p className="text-xs text-amber-600">More than 1 point from consensus</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-700">Your data is private.</strong> This performance view
                only shows your own reviews. You cannot see other reviewers&apos; identities or individual
                scores, maintaining the integrity of the blinded review process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

