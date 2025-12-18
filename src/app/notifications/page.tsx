import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Notification } from '@/types/database';
import { NotificationsTable } from './_components/NotificationsTable';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
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

  // Fetch notifications
  let notificationsQuery = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filter
  if (params.filter === 'unread') {
    notificationsQuery = notificationsQuery.eq('is_read', false);
  }

  const { data: notificationsData } = await notificationsQuery;
  const notifications = (notificationsData || []) as Notification[];

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return (
    <AppLayout user={{ profile, organization }}>
      <NotificationsTable
        notifications={notifications}
        unreadCount={unreadCount || 0}
        initialFilter={params.filter || 'all'}
      />
    </AppLayout>
  );
}

