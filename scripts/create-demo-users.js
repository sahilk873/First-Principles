#!/usr/bin/env node

/**
 * Script to create demo users in Supabase Auth
 * 
 * Usage:
 *   node scripts/create-demo-users.js
 * 
 * Requires environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (from Dashboard → Settings → API)
 */

const { createClient } = require('@supabase/supabase-js');

// User configuration
const DEMO_PASSWORD = 'Demo2024!';
const USERS = [
  {
    email: 'sysadmin@demo.io',
    name: 'System Administrator',
    role: 'SYS_ADMIN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Alpha Spine (but SYS_ADMIN can access all)
    isExpertCertified: false
  },
  {
    email: 'admin@alphaspine.io',
    name: 'Dr. Alice Admin',
    role: 'ORG_ADMIN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isExpertCertified: false
  },
  {
    email: 'admin@betahealth.io',
    name: 'Dr. Bob Boss',
    role: 'ORG_ADMIN',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: false
  },
  {
    email: 'clinician@alphaspine.io',
    name: 'Dr. Charles Clinician',
    role: 'CLINICIAN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isExpertCertified: false
  },
  {
    email: 'clinician@betahealth.io',
    name: 'Dr. Diana Doctor',
    role: 'CLINICIAN',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: false
  },
  {
    email: 'clinician2@alphaspine.io',
    name: 'Dr. Edward Expert',
    role: 'CLINICIAN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isExpertCertified: false
  },
  {
    email: 'clinician3@alphaspine.io',
    name: 'Dr. Fiona Fellow',
    role: 'CLINICIAN',
    orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isExpertCertified: false
  },
  {
    email: 'clinician2@betahealth.io',
    name: 'Dr. George General',
    role: 'CLINICIAN',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: false
  },
  // Expert Reviewers (15 total)
  {
    email: 'expert1@demo.io',
    name: 'Dr. Expert One',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert2@demo.io',
    name: 'Dr. Expert Two',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert3@demo.io',
    name: 'Dr. Expert Three',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert4@demo.io',
    name: 'Dr. Expert Four',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert5@demo.io',
    name: 'Dr. Expert Five',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert6@demo.io',
    name: 'Dr. Expert Six',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert7@demo.io',
    name: 'Dr. Expert Seven',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert8@demo.io',
    name: 'Dr. Expert Eight',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert9@demo.io',
    name: 'Dr. Expert Nine',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert10@demo.io',
    name: 'Dr. Expert Ten',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert11@demo.io',
    name: 'Dr. Expert Eleven',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert12@demo.io',
    name: 'Dr. Expert Twelve',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert13@demo.io',
    name: 'Dr. Expert Thirteen',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert14@demo.io',
    name: 'Dr. Expert Fourteen',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  },
  {
    email: 'expert15@demo.io',
    name: 'Dr. Expert Fifteen',
    role: 'EXPERT_REVIEWER',
    orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    isExpertCertified: true
  }
];

async function createDemoUsers() {
  // Get environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    console.log('\n💡 Get it from: Supabase Dashboard → Settings → API → Project URL');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('\n💡 Get it from: Supabase Dashboard → Settings → API → service_role key');
    console.log('   ⚠️  IMPORTANT: Use the service_role key, NOT the anon key!');
    process.exit(1);
  }

  // Create Supabase admin client (with service role key)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Starting user creation process...\n');
  console.log(`📍 Project: ${supabaseUrl}\n`);

  const results = [];
  const userIds = [];

  for (const userConfig of USERS) {
    try {
      console.log(`Creating user: ${userConfig.email}...`);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userConfig.email,
        password: DEMO_PASSWORD,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          name: userConfig.name
        }
      });

      if (authError) {
        const duplicateMessages = ['already registered', 'already exists', 'already been registered'];
        const errorMessage = authError.message.toLowerCase();

        if (duplicateMessages.some((msg) => errorMessage.includes(msg))) {
          console.log(`  ⚠️  User ${userConfig.email} already exists, fetching existing user...`);
          
          // Try to get existing user by email
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === userConfig.email);
          
          if (existingUser) {
            authData.user = existingUser;
            console.log(`  ✓ Found existing user: ${existingUser.id}`);
          } else {
            throw new Error(`User exists but could not be found: ${authError.message}`);
          }
        } else {
          throw authError;
        }
      }

      const userId = authData.user.id;
      userIds.push({ email: userConfig.email, id: userId });

      // Create profile using the SQL function
      const { data: profileData, error: profileError } = await supabase.rpc('create_demo_profile', {
        p_auth_id: userId,
        p_email: userConfig.email,
        p_name: userConfig.name,
        p_role: userConfig.role,
        p_org_id: userConfig.orgId,
        p_is_expert_certified: userConfig.isExpertCertified
      });

      if (profileError) {
        // Check if profile already exists
        if (profileError.message.includes('duplicate') || profileError.message.includes('already exists')) {
          console.log(`  ⚠️  Profile already exists for ${userConfig.email}, skipping...`);
          results.push({ email: userConfig.email, userId, status: 'profile_exists', success: true });
        } else {
          throw profileError;
        }
      } else {
        console.log(`  ✓ Created user and profile: ${userConfig.email} (${userId})`);
        results.push({ email: userConfig.email, userId, status: 'created', success: true });
      }
    } catch (error) {
      console.error(`  ❌ Error creating ${userConfig.email}:`, error.message);
      results.push({ email: userConfig.email, status: 'error', error: error.message, success: false });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✓ Successfully processed: ${successful}/${USERS.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${USERS.length}`);
  }

  console.log('\n📝 User IDs (for reference):');
  userIds.forEach(({ email, id }) => {
    console.log(`  ${email}: ${id}`);
  });

  if (successful === USERS.length) {
    console.log('\n✅ All users created successfully!');
    console.log('\n🔐 All users have the password: ' + DEMO_PASSWORD);
    console.log('\n📋 Next step: Run create_demo_cases() to seed test data');
    console.log('   SQL: SELECT create_demo_cases();');
  } else {
    console.log('\n⚠️  Some users failed to create. Please check the errors above.');
    process.exit(1);
  }
}

// Run the script
createDemoUsers().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
