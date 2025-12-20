'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, Case, CaseStatus, AnatomyRegion } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getStatusBadgeVariant, formatStatus } from '@/lib/utils/status';
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

interface CaseWithSubmitter extends Case {
  submitter?: { name: string } | null;
  organization?: { name: string } | null;
}

interface CasesTableProps {
  profile: Profile;
  initialStatusFilter: string;
  initialAnatomyFilter: string;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

const anatomyOptions = [
  { value: 'all', label: 'All Regions' },
  { value: 'LUMBAR', label: 'Lumbar' },
  { value: 'CERVICAL', label: 'Cervical' },
  { value: 'THORACIC', label: 'Thoracic' },
  { value: 'OTHER', label: 'Other' },
];

export function CasesTable({
  profile,
  initialStatusFilter,
  initialAnatomyFilter,
}: CasesTableProps) {
  const router = useRouter();
  const [cases, setCases] = useState<CaseWithSubmitter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [anatomyFilter, setAnatomyFilter] = useState(initialAnatomyFilter);


  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Build query based on role
    // TODO: These role-based restrictions should be mirrored by Supabase RLS policies
    let query = supabase.from('cases').select(`
      *,
      submitter:profiles!submitter_id(name),
      organization:organizations!org_id(name)
    `);

    // Apply role-based filtering
    switch (profile.role) {
      case 'CLINICIAN':
        // Clinicians see only their own cases
        query = query.eq('submitter_id', profile.id);
        break;
      case 'EXPERT_REVIEWER':
        // Expert reviewers see their own submitted cases (if any)
        // In the future, they'll primarily use /reviews
        query = query.eq('submitter_id', profile.id);
        break;
      case 'ORG_ADMIN':
        // Org admins see all cases in their organization
        query = query.eq('org_id', profile.org_id);
        break;
      case 'SYS_ADMIN':
        // Sys admins see all cases
        // No filter needed
        break;
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as CaseStatus);
    }

    // Apply anatomy filter
    if (anatomyFilter !== 'all') {
      query = query.eq('anatomy_region', anatomyFilter as AnatomyRegion);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cases:', error);
      setCases([]);
    } else {
      setCases((data || []) as CaseWithSubmitter[]);
    }

    setIsLoading(false);
  }, [profile.role, profile.id, profile.org_id, statusFilter, anatomyFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleRowClick = (caseId: string) => {
    router.push(`/cases/${caseId}`);
  };

  const canCreateCase = profile.role === 'CLINICIAN' || profile.role === 'ORG_ADMIN' || profile.role === 'SYS_ADMIN';
  const showSubmitter = profile.role === 'ORG_ADMIN' || profile.role === 'SYS_ADMIN';
  const showOrg = profile.role === 'SYS_ADMIN';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cases</h1>
          <p className="mt-1 text-slate-600">
            {profile.role === 'CLINICIAN' && 'View and manage your submitted cases'}
            {profile.role === 'EXPERT_REVIEWER' && 'View cases you have submitted'}
            {profile.role === 'ORG_ADMIN' && 'View all cases in your organization'}
            {profile.role === 'SYS_ADMIN' && 'View all cases across the platform'}
          </p>
        </div>
        {canCreateCase && (
          <Link href="/cases/new">
            <Button
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Case
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              label="Anatomy Region"
              options={anatomyOptions}
              value={anatomyFilter}
              onChange={(e) => setAnatomyFilter(e.target.value)}
            />
          </div>
          {(statusFilter !== 'all' || anatomyFilter !== 'all') && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setAnatomyFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader>
            {isLoading ? 'Loading...' : `${cases.length} case${cases.length !== 1 ? 's' : ''}`}
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Case ID</TableHead>
            <TableHead>Patient ID</TableHead>
            {showOrg && <TableHead>Organization</TableHead>}
            {showSubmitter && <TableHead>Submitter</TableHead>}
            <TableHead>Anatomy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showOrg ? 7 : showSubmitter ? 6 : 5}>
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
                      Loading cases...
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableEmptyState
                title="No cases found"
                description={
                  statusFilter !== 'all' || anatomyFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : canCreateCase
                    ? 'Create your first case to get started'
                    : 'No cases available'
                }
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
                action={
                  canCreateCase && statusFilter === 'all' && anatomyFilter === 'all' ? (
                    <Link href="/cases/new">
                      <Button size="sm">Create a case</Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              cases.map((caseItem) => (
                <TableRow
                  key={caseItem.id}
                  clickable
                  onClick={() => handleRowClick(caseItem.id)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-blue-600 hover:text-blue-700">
                      {truncateId(caseItem.id)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{caseItem.patient_pseudo_id}</TableCell>
                  {showOrg && (
                    <TableCell className="text-slate-500">
                      {caseItem.organization?.name || '—'}
                    </TableCell>
                  )}
                  {showSubmitter && (
                    <TableCell>{caseItem.submitter?.name || 'Unknown'}</TableCell>
                  )}
                  <TableCell>
                    <span className="text-sm">{caseItem.anatomy_region}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(caseItem.status)}>
                      {formatStatus(caseItem.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">{formatDate(caseItem.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
