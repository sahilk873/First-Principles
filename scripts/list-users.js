#!/usr/bin/env node

/**
 * Script to list all users in Supabase Auth and their profiles
 * 
 * Usage:
 *   node scripts/list-users.js
 * 
 * Requires environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (from Dashboard → Settings → API)
 */

const { createClient } = require('@supabase/supabase-js');

async function listUsers() {
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

  console.log('📋 Fetching all users...\n');
  console.log(`📍 Project: ${supabaseUrl}\n`);

  try {
    // Get all auth users
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    const authUsers = authUsersData?.users || [];
    console.log(`Found ${authUsers.length} auth users\n`);

    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.warn('⚠️  Warning: Could not fetch profiles:', profileError.message);
      console.log('   Showing auth users only...\n');
    }

    // Create a map of profiles by user ID
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Display users in a formatted table
    console.log('='.repeat(100));
    console.log('USER LIST');
    console.log('='.repeat(100));
    console.log('');

    if (authUsers.length === 0) {
      console.log('No users found.');
      return;
    }

    // Group users by role if profiles exist
    const usersWithProfiles = [];
    const usersWithoutProfiles = [];

    authUsers.forEach(authUser => {
      const profile = profileMap.get(authUser.id);
      if (profile) {
        usersWithProfiles.push({ auth: authUser, profile });
      } else {
        usersWithoutProfiles.push({ auth: authUser, profile: null });
      }
    });

    // Sort by role, then email
    usersWithProfiles.sort((a, b) => {
      const roleOrder = { 'SYS_ADMIN': 0, 'ORG_ADMIN': 1, 'CLINICIAN': 2, 'EXPERT_REVIEWER': 3 };
      const roleA = roleOrder[a.profile.role] || 99;
      const roleB = roleOrder[b.profile.role] || 99;
      if (roleA !== roleB) return roleA - roleB;
      return a.auth.email.localeCompare(b.auth.email);
    });

    // Display users with profiles
    if (usersWithProfiles.length > 0) {
      console.log('📊 Users with Profiles:');
      console.log('-'.repeat(100));
      
      usersWithProfiles.forEach(({ auth, profile }) => {
        console.log(`\n👤 ${auth.email}`);
        console.log(`   ID:           ${auth.id}`);
        console.log(`   Name:         ${profile.name}`);
        console.log(`   Role:         ${profile.role}${profile.is_expert_certified ? ' (Certified Expert)' : ''}`);
        console.log(`   Org ID:       ${profile.org_id}`);
        console.log(`   Created:      ${new Date(auth.created_at).toLocaleString()}`);
        console.log(`   Last Sign In: ${auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString() : 'Never'}`);
      });
    }

    // Display users without profiles
    if (usersWithoutProfiles.length > 0) {
      console.log('\n\n⚠️  Users without Profiles:');
      console.log('-'.repeat(100));
      
      usersWithoutProfiles.forEach(({ auth }) => {
        console.log(`\n👤 ${auth.email}`);
        console.log(`   ID:           ${auth.id}`);
        console.log(`   Created:      ${new Date(auth.created_at).toLocaleString()}`);
        console.log(`   Last Sign In: ${auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log(`   ⚠️  No profile found - user exists in auth but has no profile record`);
      });
    }

    // Summary statistics
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 Summary Statistics');
    console.log('='.repeat(100));
    console.log(`Total Auth Users:     ${authUsers.length}`);
    console.log(`Users with Profiles:  ${usersWithProfiles.length}`);
    console.log(`Users without Profiles: ${usersWithoutProfiles.length}`);
    
    if (profiles) {
      const roleCounts = {};
      profiles.forEach(p => {
        roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
      });
      
      console.log('\nUsers by Role:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });

      const certifiedExperts = profiles.filter(p => p.is_expert_certified).length;
      if (certifiedExperts > 0) {
        console.log(`\nCertified Expert Reviewers: ${certifiedExperts}`);
      }
    }

    // CSV export format
    console.log('\n\n' + '='.repeat(100));
    console.log('📋 CSV Format (for export)');
    console.log('='.repeat(100));
    console.log('Email,User ID,Name,Role,Org ID,Expert Certified,Created At,Last Sign In');
    
    [...usersWithProfiles, ...usersWithoutProfiles].forEach(({ auth, profile }) => {
      const email = auth.email;
      const id = auth.id;
      const name = profile?.name || 'N/A';
      const role = profile?.role || 'N/A';
      const orgId = profile?.org_id || 'N/A';
      const expertCertified = profile?.is_expert_certified ? 'Yes' : 'No';
      const createdAt = new Date(auth.created_at).toISOString();
      const lastSignIn = auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toISOString() : 'Never';
      
      console.log(`"${email}","${id}","${name}","${role}","${orgId}","${expertCertified}","${createdAt}","${lastSignIn}"`);
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }
}

// Run the script
listUsers().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

