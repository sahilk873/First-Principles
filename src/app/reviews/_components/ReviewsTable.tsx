'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, Review, Case, ReviewStatus } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant, formatStatus } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyState,
} from '@/components/ui/Table';
import { formatDate, truncateId } from '@/lib/utils/date';
import { clsx } from 'clsx';

interface ReviewWithCase extends Review {
  case?: {
    id: string;
    anatomy_region: string;
    patient_pseudo_id: string;
    org_id: string;
  } | null;
  reviewer?: {
    name: string;
  } | null;
}

interface ReviewsTableProps {
  profile: Profile;
}

type TabFilter = 'needs_review' | 'completed' | 'all';

export function ReviewsTable({ profile }: ReviewsTableProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>(
    profile.role === 'EXPERT_REVIEWER' ? 'needs_review' : 'all'
  );

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    let query = supabase.from('reviews').select(`
      *,
      case:cases!case_id(id, anatomy_region, patient_pseudo_id, org_id),
      reviewer:profiles!reviewer_id(name)
    `);

    // Role-based filtering
    switch (profile.role) {
      case 'EXPERT_REVIEWER':
        // Expert reviewers see only their assigned reviews
        query = query.eq('reviewer_id', profile.id);
        break;
      case 'ORG_ADMIN':
        // Org admins see reviews for their org's cases
        // We'll filter after fetching since we need to join through cases
        break;
      case 'SYS_ADMIN':
        // Sys admins see all reviews
        break;
      default:
        // Clinicians shouldn't see this page, but show empty
        query = query.eq('reviewer_id', profile.id);
        break;
    }

    // Tab-based filtering for expert reviewers
    if (profile.role === 'EXPERT_REVIEWER') {
      if (activeTab === 'needs_review') {
        query = query.in('status', ['ASSIGNED', 'IN_PROGRESS']);
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'SUBMITTED');
      }
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } else {
      let filteredData = (data || []) as ReviewWithCase[];

      // Additional filtering for ORG_ADMIN
      if (profile.role === 'ORG_ADMIN') {
        filteredData = filteredData.filter(r => r.case?.org_id === profile.org_id);
      }

      setReviews(filteredData);
    }

    setIsLoading(false);
  }, [profile.role, profile.id, profile.org_id, activeTab]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleRowClick = (reviewId: string) => {
    router.push(`/reviews/${reviewId}`);
  };

  // Calculate counts for tabs
  const needsReviewCount = reviews.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length;
  const completedCount = reviews.filter(r => r.status === 'SUBMITTED').length;

  const isExpertReviewer = profile.role === 'EXPERT_REVIEWER';
  const showReviewer = profile.role === 'ORG_ADMIN' || profile.role === 'SYS_ADMIN';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
          <p className="mt-1 text-slate-600">
            {profile.role === 'EXPERT_REVIEWER' && 'Review assigned cases and provide appropriateness scores'}
            {profile.role === 'ORG_ADMIN' && 'View reviews for your organization\'s cases'}
            {profile.role === 'SYS_ADMIN' && 'View all reviews across the platform'}
            {profile.role === 'CLINICIAN' && 'View your submitted reviews'}
          </p>
        </div>
      </div>

      {/* Tabs for Expert Reviewers */}
      {isExpertReviewer && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('needs_review')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'needs_review'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Needs Review
            {needsReviewCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                {needsReviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'completed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Completed
            {completedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-slate-600 text-white rounded-full text-xs">
                {completedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader>
            {isLoading ? 'Loading...' : `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Review ID</TableHead>
            <TableHead>Case ID</TableHead>
            <TableHead>Anatomy</TableHead>
            {showReviewer && <TableHead>Reviewer</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showReviewer ? 8 : 7}>
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-slate-500">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading reviews...
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableEmptyState
                title={
                  isExpertReviewer && activeTab === 'needs_review'
                    ? 'No reviews pending'
                    : isExpertReviewer && activeTab === 'completed'
                    ? 'No completed reviews'
                    : 'No reviews found'
                }
                description={
                  isExpertReviewer && activeTab === 'needs_review'
                    ? 'You\'ll see assigned cases here when they arrive'
                    : 'Reviews will appear here when available'
                }
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
              reviews.map((review) => (
                <TableRow
                  key={review.id}
                  clickable
                  onClick={() => handleRowClick(review.id)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-blue-600 hover:text-blue-700">
                      {truncateId(review.id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/cases/${review.case_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-sm text-slate-600 hover:text-blue-600"
                    >
                      {truncateId(review.case_id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{review.case?.anatomy_region || '—'}</span>
                  </TableCell>
                  {showReviewer && (
                    <TableCell>{review.reviewer?.name || 'Unknown'}</TableCell>
                  )}
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
                  <TableCell className="text-slate-500">
                    {formatDate(review.created_at)}
                  </TableCell>
                  <TableCell>
                    {isExpertReviewer && (review.status === 'ASSIGNED' || review.status === 'IN_PROGRESS') ? (
                      <Link
                        href={`/reviews/${review.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm">
                          {review.status === 'ASSIGNED' ? 'Start Review' : 'Continue'}
                        </Button>
                      </Link>
                    ) : (
                      <Link
                        href={`/reviews/${review.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

