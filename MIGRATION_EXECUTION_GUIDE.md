# Migration Execution Guide

This guide will help you execute all migrations and set up your First Principles database.

## Step 1: Execute All Migrations

Go to **Supabase Dashboard → SQL Editor** and run each migration file **in order**:

### Migration 001: Initial Schema
Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor and run it.

**Verify**: Go to Tables section - you should see 7 tables:
- organizations
- profiles
- cases
- reviews
- case_results
- notifications
- audit_logs

### Migration 002: Seed Data (Organizations)
Copy and paste the entire contents of `supabase/migrations/002_seed_data.sql` into the SQL Editor and run it.

**Verify**: Run `SELECT * FROM organizations;` - you should see 3 organizations.

### Migration 003: Storage Bucket
Copy and paste the entire contents of `supabase/migrations/003_storage_bucket.sql` into the SQL Editor and run it.

**Verify**: Go to Storage section - you should see `imaging` bucket.

### Migration 004: Review Workflow Policies
Copy and paste the entire contents of `supabase/migrations/004_review_workflow_policies.sql` into the SQL Editor and run it.

**Verify**: No errors should appear.

### Migration 005: Comprehensive Seed Data
Copy and paste the entire contents of `supabase/migrations/005_comprehensive_seed_data.sql` into the SQL Editor and run it.

This creates:
- 2 organizations (Alpha Spine Institute, Beta Health System) - **these will be used for profiles**
- Helper function: `create_demo_profile()`
- Helper function: `create_demo_cases()`

**Verify**: Run `SELECT create_demo_profile;` - you should see the function exists.

**Important**: Migration 005 creates organizations with IDs:
- Alpha Spine: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- Beta Health: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`

These are the IDs you'll use when creating profiles.

### Migration 006: Admin RLS Policies
Copy and paste the entire contents of `supabase/migrations/006_admin_rls_policies.sql` into the SQL Editor and run it.

**Verify**: No errors should appear.

---

## Step 2: Create Auth Users

Go to **Supabase Dashboard → Authentication → Users → Add User**

Create the following users (use "Auto Confirm User" and password `Demo2024!`):

1. `sysadmin@demo.io` → Copy UUID: `_________________`
2. `admin@alphaspine.io` → Copy UUID: `_________________`
3. `admin@betahealth.io` → Copy UUID: `_________________`
4. `clinician@alphaspine.io` → Copy UUID: `_________________`
5. `clinician@betahealth.io` → Copy UUID: `_________________`
6. `expert1@demo.io` → Copy UUID: `_________________`
7. `expert2@demo.io` → Copy UUID: `_________________`
8. `expert3@demo.io` → Copy UUID: `_________________`
9. `expert4@demo.io` → Copy UUID: `_________________`
10. `expert5@demo.io` → Copy UUID: `_________________`

---

## Step 3: Get Organization IDs

In SQL Editor, run:
```sql
SELECT id, name FROM organizations WHERE name IN ('Alpha Spine Institute', 'Beta Health System');
```

Copy the IDs:
- Alpha Spine Institute ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (should match)
- Beta Health System ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` (should match)

---

## Step 4: Create User Profiles

In SQL Editor, run the following commands, replacing `<UUID>` and `<ORG-ID>` with actual values:

### System Admin
```sql
SELECT create_demo_profile(
  '<sysadmin-uuid>', 
  'sysadmin@demo.io', 
  'System Administrator', 
  'SYS_ADMIN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);
```

### Org Admin (Alpha Spine)
```sql
SELECT create_demo_profile(
  '<admin-alphaspine-uuid>', 
  'admin@alphaspine.io', 
  'Dr. Alice Admin', 
  'ORG_ADMIN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);
```

### Org Admin (Beta Health)
```sql
SELECT create_demo_profile(
  '<admin-betahealth-uuid>', 
  'admin@betahealth.io', 
  'Dr. Bob Boss', 
  'ORG_ADMIN', 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  false
);
```

### Clinician (Alpha Spine)
```sql
SELECT create_demo_profile(
  '<clinician-alphaspine-uuid>', 
  'clinician@alphaspine.io', 
  'Dr. Charles Clinician', 
  'CLINICIAN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);
```

### Clinician (Beta Health)
```sql
SELECT create_demo_profile(
  '<clinician-betahealth-uuid>', 
  'clinician@betahealth.io', 
  'Dr. Diana Doctor', 
  'CLINICIAN', 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  false
);
```

### Expert Reviewers (All 5)
```sql
SELECT create_demo_profile('<expert1-uuid>', 'expert1@demo.io', 'Dr. Expert One', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert2-uuid>', 'expert2@demo.io', 'Dr. Expert Two', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert3-uuid>', 'expert3@demo.io', 'Dr. Expert Three', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert4-uuid>', 'expert4@demo.io', 'Dr. Expert Four', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert5-uuid>', 'expert5@demo.io', 'Dr. Expert Five', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
```

**Verify profiles created:**
```sql
SELECT email, name, role, org_id, is_expert_certified FROM profiles ORDER BY role, email;
```

Should see all 10 profiles.

---

## Step 5: Create Demo Cases

In SQL Editor, run:
```sql
SELECT create_demo_cases();
```

This will create:
- 1 DRAFT case
- 1 UNDER_REVIEW case (with 5 assigned reviewers)
- 1 COMPLETED case (with full results)

**Verify cases created:**
```sql
SELECT id, status, submitter_id, created_at FROM cases ORDER BY created_at DESC;
```

Should see at least 3 cases.

**Verify reviews assigned:**
```sql
SELECT case_id, reviewer_id, status FROM reviews;
```

Should see reviews for the UNDER_REVIEW and COMPLETED cases.

---

## Step 6: Final Verification

Run these queries to verify everything is set up correctly:

### Check all tables have data
```sql
SELECT 
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'cases', COUNT(*) FROM cases
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'case_results', COUNT(*) FROM case_results
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;
```

### Verify RLS policies are active
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Should see multiple policies per table.

### Check storage bucket exists
Go to Storage section in Supabase Dashboard - should see `imaging` bucket.

---

## Next Steps

Once all migrations and data are set up:

1. **Test Login** - Try logging in with different user accounts
2. **Test Notifications** - Check the notification bell and notifications page
3. **Test Case Workflow** - Create a new case, submit it, and test the review process
4. **Test Admin Features** - Access admin pages with sysadmin and org admin accounts

---

## Troubleshooting

### "Profile not found" after login
- User exists in auth but no profile in database
- Run: `SELECT create_demo_profile('<uuid>', 'email@example.com', 'Name', 'CLINICIAN', '<org-id>', false);`

### "Not enough expert reviewers"
- Need at least 5 certified expert reviewers
- Verify: `SELECT COUNT(*) FROM profiles WHERE role = 'EXPERT_REVIEWER' AND is_expert_certified = true;`
- Should return 5 or more

### Migration errors
- Make sure you're running migrations in order (001 → 002 → 003 → 004 → 005 → 006)
- Check for error messages in SQL Editor
- Some migrations can be safely re-run due to `ON CONFLICT` clauses

