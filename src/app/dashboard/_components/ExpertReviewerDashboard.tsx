import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Profile, Organization, Review } from '@/types/database';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getStatusBadgeVariant, formatStatus } from '@/lib/utils/status';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { formatDate, truncateId } from '@/lib/utils/date';

interface ExpertReviewerDashboardProps {
  profile: Profile;
  organization: Organization;
}

export async function ExpertReviewerDashboard({ profile, organization }: ExpertReviewerDashboardProps) {
  const supabase = await createClient();

  // Fetch pending reviews count
  const { count: pendingReviewsCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', profile.id)
    .in('status', ['ASSIGNED', 'IN_PROGRESS']);

  // Fetch completed reviews count
  const { count: completedReviewsCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', profile.id)
    .eq('status', 'SUBMITTED');

  // Fetch last 5 reviews
  const { data: recentReviewsData } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewer_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentReviews = (recentReviewsData || []) as Review[];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {profile.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-slate-600">
          {organization.name} • Expert Reviewer Dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Cases Needing Review"
          value={pendingReviewsCount || 0}
          color="amber"
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
          title="Reviews Completed"
          value={completedReviewsCount || 0}
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
          title="Total Assigned"
          value={(pendingReviewsCount || 0) + (completedReviewsCount || 0)}
          color="slate"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </div>

      {/* Expert certification badge */}
      {profile.is_expert_certified && (
        <Card className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Expert Certified Reviewer</h3>
              <p className="text-sm text-amber-700">
                You&apos;re qualified to review spine surgery cases and provide appropriateness scores.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Reviews Call to Action */}
      {(pendingReviewsCount || 0) > 0 && (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Cases Awaiting Your Review</h3>
                <p className="text-sm text-slate-600">
                  You have {pendingReviewsCount} case{pendingReviewsCount !== 1 ? 's' : ''} pending your expert assessment.
                </p>
              </div>
            </div>
            <Link href="/reviews">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Start Reviewing
              </button>
            </Link>
          </div>
        </Card>
      )}

      {/* Recent Reviews Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader
            action={
              <Link href="/reviews" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all reviews →
              </Link>
            }
          >
            Recent Reviews
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Review ID</TableHead>
            <TableHead>Case ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {recentReviews.length === 0 ? (
              <TableEmptyState
                title="No reviews assigned"
                description="You'll be notified when new cases are assigned for review"
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                }
              />
            ) : (
              recentReviews.map((review) => (
                <TableRow key={review.id} clickable>
                  <TableCell>
                    <Link
                      href={`/reviews/${review.id}`}
                      className="font-mono text-sm text-blue-600 hover:text-blue-700"
                    >
                      {truncateId(review.id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{truncateId(review.case_id)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(review.status)}>
                      {formatStatus(review.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {review.appropriateness_score ? (
                      <span className="font-semibold">{review.appropriateness_score}/9</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">{formatDate(review.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
