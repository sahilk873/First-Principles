import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Profile, Organization, Case } from '@/types/database';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant, formatStatus } from '@/components/ui/Badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { formatDate, truncateId, getStartOfMonth } from '@/lib/utils/date';

interface OrgAdminDashboardProps {
  profile: Profile;
  organization: Organization;
}

interface CaseWithSubmitter extends Case {
  submitter?: { name: string } | null;
}

export async function OrgAdminDashboard({ profile, organization }: OrgAdminDashboardProps) {
  const supabase = await createClient();

  // Fetch cases this month count
  const startOfMonth = getStartOfMonth();
  const { count: casesThisMonthCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .gte('created_at', startOfMonth);

  // Fetch completed cases count
  const { count: completedCasesCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'COMPLETED');

  // Fetch total cases count
  const { count: totalCasesCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  // Fetch users count in org
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  // Fetch last 10 cases with submitter info
  const { data: recentCasesData } = await supabase
    .from('cases')
    .select(`
      *,
      submitter:profiles!submitter_id(name)
    `)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(10);

  const recentCases = (recentCasesData || []) as CaseWithSubmitter[];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Organization Dashboard</h1>
        <p className="mt-1 text-slate-600">{organization.name}</p>
      </div>

      {/* Organization Info Card */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">{organization.name}</h3>
            <p className="text-sm text-blue-700">
              {organization.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              {organization.region && ` • ${organization.region}`}
            </p>
            <p className="text-sm text-blue-600 mt-1">{usersCount} team members</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Cases This Month"
          value={casesThisMonthCount || 0}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Completed"
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
          title="Total Cases"
          value={totalCasesCount || 0}
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
        <StatCard
          title="Team Members"
          value={usersCount || 0}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
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
            Recent Organization Cases
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Case ID</TableHead>
            <TableHead>Submitter</TableHead>
            <TableHead>Patient ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {recentCases.length === 0 ? (
              <TableEmptyState
                title="No cases yet"
                description="Cases submitted by your organization will appear here"
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
                  <TableCell className="font-medium">
                    {caseItem.submitter?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>{caseItem.patient_pseudo_id}</TableCell>
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

