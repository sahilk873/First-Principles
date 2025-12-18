import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization } from '@/types/database';
import { OrganizationManagementTable } from './_components/OrganizationManagementTable';

export default async function AdminOrgsPage() {
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

  // Only SYS_ADMIN can access this page
  if (profile.role !== 'SYS_ADMIN') {
    redirect('/dashboard');
  }

  // Fetch the current user's organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  const organization = orgData as Organization | null;

  if (orgError || !organization) {
    redirect('/login');
  }

  // Fetch all organizations
  const { data: orgsData } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  const organizations = (orgsData || []) as Organization[];

  // Get user counts per organization
  const { data: userCounts } = await supabase
    .from('profiles')
    .select('org_id');

  const userCountMap: Record<string, number> = {};
  (userCounts || []).forEach((u: { org_id: string }) => {
    userCountMap[u.org_id] = (userCountMap[u.org_id] || 0) + 1;
  });

  // Get case counts per organization
  const { data: caseCounts } = await supabase
    .from('cases')
    .select('org_id');

  const caseCountMap: Record<string, number> = {};
  (caseCounts || []).forEach((c: { org_id: string }) => {
    caseCountMap[c.org_id] = (caseCountMap[c.org_id] || 0) + 1;
  });

  // Attach stats to each organization
  const orgsWithStats = organizations.map((org) => ({
    ...org,
    userCount: userCountMap[org.id] || 0,
    caseCount: caseCountMap[org.id] || 0,
  }));

  return (
    <AppLayout user={{ profile, organization }}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Organization Management</h1>
          <p className="mt-1 text-slate-600">
            Create and manage healthcare organizations on the platform
          </p>
        </div>

        {/* Organization Management Table */}
        <OrganizationManagementTable organizations={orgsWithStats} />
      </div>
    </AppLayout>
  );
}

