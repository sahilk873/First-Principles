# Next Steps After Migrations

Great! All 6 migrations have been applied. Here's what to do next:

## Step 1: Verify Migrations (Quick Check)

Run this in Supabase SQL Editor to verify everything:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check organizations
SELECT id, name FROM organizations;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('create_demo_profile', 'create_demo_cases');
```

## Step 2: Create Auth Users

Go to **Supabase Dashboard → Authentication → Users → Add User**

Create these 10 users (use password: `Demo2024!` and ✅ "Auto Confirm User"):

1. `sysadmin@demo.io`
2. `admin@alphaspine.io`
3. `admin@betahealth.io`
4. `clinician@alphaspine.io`
5. `clinician@betahealth.io`
6. `expert1@demo.io`
7. `expert2@demo.io`
8. `expert3@demo.io`
9. `expert4@demo.io`
10. `expert5@demo.io`

**Important**: After creating each user, copy their UUID (you'll need it for Step 3).

## Step 3: Create User Profiles

Once you have all the UUIDs, run these SQL commands (replace `<UUID>` with actual UUIDs):

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

### Expert Reviewers (All 5 - must be certified)
```sql
SELECT create_demo_profile('<expert1-uuid>', 'expert1@demo.io', 'Dr. Expert One', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert2-uuid>', 'expert2@demo.io', 'Dr. Expert Two', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert3-uuid>', 'expert3@demo.io', 'Dr. Expert Three', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert4-uuid>', 'expert4@demo.io', 'Dr. Expert Four', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<expert5-uuid>', 'expert5@demo.io', 'Dr. Expert Five', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
```

## Step 4: Create Demo Cases

After creating all profiles, run:

```sql
SELECT create_demo_cases();
```

This creates sample cases with different statuses (DRAFT, UNDER_REVIEW, COMPLETED).

## Step 5: Verify Everything

Run the verification queries from `verify_setup.sql` to confirm everything is set up correctly.

