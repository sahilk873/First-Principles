const { createClient } = require('@supabase/supabase-js');

const supabaseAnon = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
);

const supabaseService = createClient(
  'http://127.0.0.1:54321',
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

async function testProfileCreation() {
  console.log('🧪 Testing profile creation for non-existent user...\n');

  // Create a test user first
  const testEmail = `test-${Date.now()}@example.com`;
  const { data: newUser, error: createUserError } = await supabaseService.auth.admin.createUser({
    email: testEmail,
    password: 'Test1234!',
    email_confirm: true
  });

  if (createUserError || !newUser.user) {
    console.log('❌ Failed to create test user:', createUserError);
    return;
  }

  console.log('✅ Created test user:', testEmail, 'ID:', newUser.user.id);

  // Sign in as this user with anon key
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password: 'Test1234!'
  });

  if (authError) {
    console.log('❌ Auth failed:', authError.message);
    return;
  }

  console.log('✅ Signed in with anon key');

  // Check if profile exists (should not)
  const { data: existingProfile, error: fetchError } = await supabaseAnon
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  console.log('\nProfile check:');
  console.log('  Exists:', !!existingProfile);
  console.log('  Error:', fetchError ? {
    code: fetchError.code,
    message: fetchError.message
  } : 'None');

  if (existingProfile) {
    console.log('⚠️ Profile already exists, skipping creation test');
    return;
  }

  // Try to create profile
  console.log('\nAttempting to create profile...');
  const { data: createdProfile, error: createError } = await supabaseAnon
    .from('profiles')
    .insert({
      id: authData.user.id,
      org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: testEmail,
      name: 'Test User',
      role: 'CLINICIAN',
      is_expert_certified: false,
      specialties: []
    })
    .select()
    .single();

  console.log('\nCreate result:');
  console.log('  Success:', !!createdProfile);
  console.log('  Error:', createError ? {
    code: createError.code,
    message: createError.message,
    details: createError.details,
    hint: createError.hint
  } : 'None');

  if (createError) {
    console.log('\n❌ Profile creation failed - this is the issue!');
  } else {
    console.log('\n✅ Profile creation succeeded');
  }
}

testProfileCreation().catch(console.error);
