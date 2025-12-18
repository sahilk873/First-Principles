const { createClient } = require('@supabase/supabase-js');

// Simulate the exact login flow from dashboard page
const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

async function testLoginFlow() {
  console.log('🔄 Testing complete login flow...\n');

  try {
    // Step 1: Sign in (simulating user login)
    console.log('1. Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@alphaspine.io',
      password: 'Demo2024!'
    });

    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      return;
    }

    console.log('✅ Auth successful, user ID:', authData.user.id);

    // Step 2: Get user from session (like middleware does)
    console.log('\n2. Getting user session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('❌ Session failed:', userError?.message);
      return;
    }

    console.log('✅ Session valid, email:', user.email);

    // Step 3: Try to get/create profile (like dashboard does)
    console.log('\n3. Checking profile creation logic...');

    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile && !fetchError) {
      console.log('✅ Profile exists:', existingProfile.email, '- Role:', existingProfile.role);
    } else {
      console.log('⚠️ Profile does not exist, would try to create...');
      console.log('Fetch error:', fetchError?.message);
    }

    // Step 4: Try to get organization (like dashboard does)
    if (existingProfile) {
      console.log('\n4. Checking organization access...');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', existingProfile.org_id)
        .single();

      if (orgData && !orgError) {
        console.log('✅ Organization accessible:', orgData.name);
      } else {
        console.log('❌ Organization access failed:', orgError?.message);
      }
    }

    console.log('\n🎉 Login flow simulation completed successfully!');

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

testLoginFlow();
