import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization } from '@/types/database';
import { ClinicianDashboard } from './_components/ClinicianDashboard';
import { ExpertReviewerDashboard } from './_components/ExpertReviewerDashboard';
import { OrgAdminDashboard } from './_components/OrgAdminDashboard';
import { SysAdminDashboard } from './_components/SysAdminDashboard';
import { createProfileIfMissing } from '@/lib/utils/createProfileIfMissing';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect('/login');
  }

  // Try to get or create the user's profile
  const profile = await createProfileIfMissing(
    supabase,
    user.id,
    user.email,
    user.user_metadata
  );

  // If profile still doesn't exist after trying to create it, show error
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Profile Setup Required</h1>
          <p className="mt-2 text-slate-600">
            Your user profile hasn&apos;t been created yet. Please contact your organization
            administrator to complete your account setup.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Logged in as: <span className="font-medium">{user.email}</span>
          </p>
        </div>
      </div>
    );
  }

  // Fetch the organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  const organization = orgData as Organization | null;

  if (orgError || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Organization Not Found</h1>
          <p className="mt-2 text-slate-600">
            Unable to load your organization details. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (profile.role) {
      case 'CLINICIAN':
        return <ClinicianDashboard profile={profile} organization={organization} />;
      case 'EXPERT_REVIEWER':
        return <ExpertReviewerDashboard profile={profile} organization={organization} />;
      case 'ORG_ADMIN':
        return <OrgAdminDashboard profile={profile} organization={organization} />;
      case 'SYS_ADMIN':
        return <SysAdminDashboard profile={profile} organization={organization} />;
      default:
        return <ClinicianDashboard profile={profile} organization={organization} />;
    }
  };

  return (
    <AppLayout user={{ profile, organization }}>
      {renderDashboard()}
    </AppLayout>
  );
}
