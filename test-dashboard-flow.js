const { createClient } = require('@supabase/supabase-js');
const { getProfileConfigFromEmail } = require('./src/lib/utils/profile');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

// Simulate the createProfileIfMissing function logic
async function createProfileIfMissing(supabaseClient, userId, userEmail, userMetadata) {
  console.log('🔍 Checking for existing profile...');

  // First, check if profile already exists
  const { data: existingProfile, error: fetchError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile && !fetchError) {
    console.log('✅ Profile already exists:', existingProfile.email);
    return existingProfile;
  }

  console.log('⚠️ Profile does not exist, attempting creation...');

  // Profile doesn't exist, try to create it
  const profileConfig = getProfileConfigFromEmail(userEmail);

  if (!profileConfig) {
    console.log('❌ No profile config found for email:', userEmail);
    return null;
  }

  console.log('📝 Profile config found:', profileConfig);

  // Create profile directly (our fix)
  const { data: createdProfile, error: createError } = await supabaseClient
    .from('profiles')
    .insert({
      id: userId,
      org_id: profileConfig.orgId,
      email: userEmail,
      name: userEmail.split('@')[0], // Simple name extraction
      role: profileConfig.role,
      is_expert_certified: profileConfig.isExpertCertified,
      specialties: []
    })
    .select()
    .single();

  if (createError || !createdProfile) {
    console.log('❌ Profile creation failed:', createError?.message);
    return null;
  }

  console.log('✅ Profile created successfully:', createdProfile.email);
  return createdProfile;
}

async function testDashboardFlow() {
  console.log('🖥️ Testing dashboard page flow...\n');

  try {
    // Step 1: Sign in
    console.log('1. Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@alphaspine.io',
      password: 'Demo2024!'
    });

    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      return;
    }

    const user = authData.user;
    console.log('✅ Auth successful');

    // Step 2: Simulate dashboard logic
    console.log('\n2. Simulating dashboard profile check...');

    const profile = await createProfileIfMissing(
      supabase,
      user.id,
      user.email,
      user.user_metadata
    );

    if (!profile) {
      console.log('❌ Profile setup failed - this would show the error page');
      return;
    }

    console.log('✅ Profile ready:', profile.role);

    // Step 3: Test organization fetch
    console.log('\n3. Testing organization fetch...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single();

    if (orgError || !orgData) {
      console.log('❌ Organization fetch failed:', orgError?.message);
      return;
    }

    console.log('✅ Organization ready:', orgData.name);

    console.log('\n🎉 Dashboard flow would work! No error page shown.');

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

testDashboardFlow();
