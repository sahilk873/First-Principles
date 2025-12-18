const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

async function testProfile() {
  // Check if admin profile exists
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@alphaspine.io')
    .single();

  console.log('Profile check result:', { profile, error });

  if (!profile) {
    console.log('Creating profile directly...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: '237807be-4eda-4539-aaf1-700bc506d3e2',
        org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'admin@alphaspine.io',
        name: 'Dr. Alice Admin',
        role: 'ORG_ADMIN',
        is_expert_certified: false,
        specialties: []
      })
      .select()
      .single();

    console.log('Profile creation result:', { newProfile, createError });
  }
}

testProfile().catch(console.error);
