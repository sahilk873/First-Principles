const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

async function testAuth() {
  console.log('Testing authentication...');

  // Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@alphaspine.io',
    password: 'Demo2024!'
  });

  console.log('Auth result:', { user: data?.user?.id, error });

  if (data?.user) {
    // Try to get user session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session result:', { session: !!sessionData?.session, error: sessionError });

    // Try to access profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    console.log('Profile access result:', { profile: profile?.email, error: profileError });

    // Also try to access organizations table
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile?.org_id)
      .single();

    console.log('Organization access result:', { org: org?.name, error: orgError });
  }
}

testAuth().catch(console.error);
