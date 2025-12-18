import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization } from '@/types/database';
import { UserManagementTable } from './_components/UserManagementTable';

export default async function AdminUsersPage() {
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

  // Check if user is an admin
  if (profile.role !== 'ORG_ADMIN' && profile.role !== 'SYS_ADMIN') {
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

  // Fetch all organizations (for SYS_ADMIN)
  let allOrganizations: Organization[] = [];
  if (profile.role === 'SYS_ADMIN') {
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    allOrganizations = (orgsData || []) as Organization[];
  } else {
    allOrganizations = [organization];
  }

  // Fetch users based on role
  let usersQuery = supabase.from('profiles').select('*');

  if (profile.role === 'ORG_ADMIN') {
    // ORG_ADMIN sees only users in their org
    usersQuery = usersQuery.eq('org_id', profile.org_id);
  }
  // SYS_ADMIN sees all users

  const { data: usersData } = await usersQuery.order('name');
  const users = (usersData || []) as Profile[];

  // Attach organization info to each user
  const usersWithOrgs = users.map((u) => ({
    ...u,
    organization: allOrganizations.find((org) => org.id === u.org_id),
  }));

  return (
    <AppLayout user={{ profile, organization }}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">User Administration</h1>
          <p className="mt-1 text-slate-600">
            {profile.role === 'SYS_ADMIN'
              ? 'Manage users across all organizations'
              : 'Manage users in your organization'}
          </p>
        </div>

        {/* Info Card */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Managing Users</h3>
              <p className="mt-1 text-sm text-blue-700">
                {profile.role === 'SYS_ADMIN' ? (
                  <>
                    As a System Admin, you can change any user&apos;s role (including SYS_ADMIN), 
                    reassign users to different organizations, and toggle expert certification.
                  </>
                ) : (
                  <>
                    As an Organization Admin, you can change roles between Clinician and Expert Reviewer, 
                    and toggle expert certification for users in your organization.
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-blue-600">
                <strong>Note:</strong> To add new users, create them through the Supabase Authentication dashboard, 
                then run the profile creation SQL script.
              </p>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <UserManagementTable
          users={usersWithOrgs}
          organizations={allOrganizations}
          currentUserRole={profile.role}
          currentUserOrgId={profile.org_id}
        />
      </div>
    </AppLayout>
  );
}
