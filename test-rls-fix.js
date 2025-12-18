const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

async function testRLSFix() {
  console.log('🧪 Testing RLS recursion fix...\n');

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@alphaspine.io',
    password: 'Demo2024!'
  });

  if (authError) {
    console.log('❌ Auth failed:', authError.message);
    return;
  }

  console.log('✅ Signed in, user ID:', authData.user.id);

  // Test profile access (this was causing infinite recursion before)
  console.log('\n1. Testing profile access...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.log('❌ Profile access failed:', {
      code: profileError.code,
      message: profileError.message
    });
    if (profileError.code === '42P17') {
      console.log('⚠️ Still getting infinite recursion error!');
    }
    return;
  }

  console.log('✅ Profile access successful:', profile.email);

  // Test profile creation (simulating createProfileIfMissing)
  console.log('\n2. Testing profile check logic...');
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.log('❌ Unexpected error:', {
      code: fetchError.code,
      message: fetchError.message
    });
    if (fetchError.code === '42P17') {
      console.log('⚠️ Still getting infinite recursion error!');
    }
    return;
  }

  console.log('✅ Profile check successful');

  console.log('\n🎉 RLS recursion issue is FIXED! No more infinite recursion errors.');
}

testRLSFix().catch(console.error);
