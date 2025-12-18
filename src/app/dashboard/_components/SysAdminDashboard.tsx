import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Profile, Organization } from '@/types/database';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';

interface SysAdminDashboardProps {
  profile: Profile;
  organization: Organization;
}

interface OrganizationWithCaseCount extends Organization {
  cases_count: number;
}

export async function SysAdminDashboard({ profile }: SysAdminDashboardProps) {
  const supabase = await createClient();

  // Fetch total organizations count
  const { count: totalOrgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  // Fetch total cases count
  const { count: totalCasesCount } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });

  // Fetch total users count
  const { count: totalUsersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Fetch total reviews count
  const { count: totalReviewsCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  // Fetch organizations with case counts
  // Note: This is a simplified query - in production you might use a view or RPC
  const { data: orgsDataRaw } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  const orgsData = (orgsDataRaw || []) as Organization[];

  // Get case counts for each organization
  const orgsWithCounts: OrganizationWithCaseCount[] = [];
  for (const org of orgsData) {
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id);
    
    orgsWithCounts.push({
      ...org,
      cases_count: count || 0,
    });
  }

  const getOrgTypeBadge = (type: string) => {
    switch (type) {
      case 'hospital':
        return <Badge variant="info">Hospital</Badge>;
      case 'private_practice':
        return <Badge variant="success">Private Practice</Badge>;
      case 'aco':
        return <Badge variant="purple">ACO</Badge>;
      default:
        return <Badge variant="default">Other</Badge>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
        <p className="mt-1 text-slate-600">
          Welcome back, {profile.name.split(' ')[0]}
        </p>
      </div>

      {/* System Admin Badge */}
      <Card className="mb-8 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">System Administrator Access</h3>
            <p className="text-sm text-purple-700">
              Full access to all organizations, users, and system settings
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Organizations"
          value={totalOrgsCount || 0}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />
        <StatCard
          title="Total Cases"
          value={totalCasesCount || 0}
          color="blue"
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
          title="Total Users"
          value={totalUsersCount || 0}
          color="teal"
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
        <StatCard
          title="Total Reviews"
          value={totalReviewsCount || 0}
          color="amber"
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

      {/* Organizations Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardHeader
            action={
              <Link href="/admin/users" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Manage users →
              </Link>
            }
          >
            All Organizations
          </CardHeader>
        </div>
        <Table>
          <TableHeader>
            <TableHead>Organization</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Region</TableHead>
            <TableHead align="center">Cases</TableHead>
          </TableHeader>
          <TableBody>
            {orgsWithCounts.length === 0 ? (
              <TableEmptyState
                title="No organizations"
                description="Organizations will appear here once created"
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                }
              />
            ) : (
              orgsWithCounts.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{getOrgTypeBadge(org.type)}</TableCell>
                  <TableCell className="text-slate-500">{org.region || '—'}</TableCell>
                  <TableCell align="center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                      {org.cases_count}
                    </span>
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

