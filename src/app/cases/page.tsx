import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization } from '@/types/database';
import { CasesTable } from './_components/CasesTable';

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; anatomy?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

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

  return (
    <AppLayout user={{ profile, organization }}>
      <CasesTable
        profile={profile}
        initialStatusFilter={params.status || 'all'}
        initialAnatomyFilter={params.anatomy || 'all'}
      />
    </AppLayout>
  );
}

