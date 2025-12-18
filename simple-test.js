const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

async function simpleTest() {
  console.log('🧪 Simple test: Can admin@alphaspine.io access their profile?\n');

  try {
    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@alphaspine.io',
      password: 'Demo2024!'
    });

    if (error) {
      console.log('❌ LOGIN FAILED:', error.message);
      return;
    }

    console.log('✅ LOGIN SUCCESSFUL');

    // Try to get profile (this is what was failing before)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.log('❌ PROFILE ACCESS FAILED:', profileError.message);
      console.log('This would cause the "Profile Setup Required" error!');
      return;
    }

    console.log('✅ PROFILE ACCESS SUCCESSFUL');
    console.log('   Email:', profile.email);
    console.log('   Role:', profile.role);
    console.log('   Org ID:', profile.org_id);

    // Test organization access too
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single();

    if (orgError) {
      console.log('❌ ORGANIZATION ACCESS FAILED:', orgError.message);
      return;
    }

    console.log('✅ ORGANIZATION ACCESS SUCCESSFUL:', org.name);

    console.log('\n🎯 CONCLUSION: Login will work! No more "Profile Setup Required" error.');

  } catch (error) {
    console.log('💥 UNEXPECTED ERROR:', error.message);
  }
}

simpleTest();
