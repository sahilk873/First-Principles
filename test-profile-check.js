const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

async function testProfileCheck() {
  console.log('🧪 Testing profile check logic...\n');

  // Sign in first
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@alphaspine.io',
    password: 'Demo2024!'
  });

  if (authError) {
    console.log('❌ Auth failed:', authError.message);
    return;
  }

  console.log('✅ Signed in, user ID:', authData.user.id);

  // Test the exact check logic from createProfileIfMissing
  console.log('\n1. Checking if profile exists...');
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  console.log('Profile data:', existingProfile ? 'Found' : 'Not found');
  console.log('Fetch error:', fetchError ? {
    code: fetchError.code,
    message: fetchError.message,
    details: fetchError.details
  } : 'None');

  if (existingProfile) {
    console.log('✅ Profile exists:', existingProfile.email);
    return;
  }

  // If not found, try to create
  console.log('\n2. Profile not found, testing creation...');
  
  const profileConfig = {
    role: 'ORG_ADMIN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isExpertCertified: false
  };

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      org_id: profileConfig.orgId,
      email: authData.user.email,
      name: 'Test User',
      role: profileConfig.role,
      is_expert_certified: profileConfig.isExpertCertified,
      specialties: []
    })
    .select()
    .single();

  console.log('Create result:', createdProfile ? 'Success' : 'Failed');
  console.log('Create error:', createError ? {
    code: createError.code,
    message: createError.message,
    details: createError.details,
    hint: createError.hint
  } : 'None');
}

testProfileCheck().catch(console.error);
