import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Profile, Organization, Case } from '@/types/database';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getStatusBadgeVariant, formatStatus } from '@/lib/utils/status';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { formatDate, truncateId } from '@/lib/utils/date';

interface ClinicianDashboardProps {
  profile: Profile;
  organization: Organization;
}

export async function ClinicianDashboard({ profile, organization }: ClinicianDashboardProps) {
  const supabase = await createClient();

  // Fetch cases in review count
  const { count: casesInReviewCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('submitter_id', profile.id)
    .in('status', ['SUBMITTED', 'UNDER_REVIEW']);

  // Fetch completed cases count
  const { count: completedCasesCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('submitter_id', profile.id)
    .eq('status', 'COMPLETED');

  // Fetch last 5 cases
  const { data: recentCasesData } = await supabase
    .from('cases')
    .select('*')
    .eq('submitter_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentCases = (recentCasesData || []) as Case[];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {profile.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-slate-600">
            {organization.name} • Clinician Dashboard
          </p>
        </div>
        <Link href="/cases/new">
          <Button
            size="lg"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Case
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Cases in Review"
          value={casesInReviewCount || 0}
          color="blue"
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
        <StatCard
          title="Completed Cases"
          value={completedCasesCount || 0}
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
          title="Total Submitted"
          value={(casesInReviewCount || 0) + (completedCasesCount || 0)}
          color="slate"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Recent Cases Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader
            action={
              <Link href="/cases" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all cases →
              </Link>
            }
          >
            Recent Cases
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Case ID</TableHead>
            <TableHead>Patient ID</TableHead>
            <TableHead>Anatomy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {recentCases.length === 0 ? (
              <TableEmptyState
                title="No cases yet"
                description="Submit your first case to get started"
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
                  <Link href="/cases/new">
                    <Button size="sm">Create your first case</Button>
                  </Link>
                }
              />
            ) : (
              recentCases.map((caseItem) => (
                <TableRow key={caseItem.id} clickable>
                  <TableCell>
                    <Link
                      href={`/cases/${caseItem.id}`}
                      className="font-mono text-sm text-blue-600 hover:text-blue-700"
                    >
                      {truncateId(caseItem.id)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{caseItem.patient_pseudo_id}</TableCell>
                  <TableCell>{caseItem.anatomy_region}</TableCell>
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
