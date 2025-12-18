# First Principles - Setup Checklist

Use this checklist to ensure everything is properly configured before running the application.

## ✅ Prerequisites

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Supabase account created at [supabase.com](https://supabase.com)

---

## 1. Supabase Project Setup

- [ ] **Create Supabase Project**
  - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
  - Click "New Project"
  - Choose organization, name, database password, and region
  - Wait for project to be provisioned (2-3 minutes)

- [ ] **Get API Credentials**
  - Go to: Project Settings → API
  - Copy the following values:
    - `Project URL` (e.g., `https://xxxxx.supabase.co`)
    - `anon` `public` key (starts with `eyJ...`)

- [ ] **Create `.env.local` file**
  ```bash
  cd /Users/sahilkapadia/Downloads/First-Principles
  touch .env.local
  ```
  
- [ ] **Add environment variables to `.env.local`**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
  ```
  Replace with your actual values from Supabase Dashboard

---

## 2. Database Migrations (Run in Supabase SQL Editor)

**Location**: Supabase Dashboard → SQL Editor → New Query

Run each migration **in order**:

- [ ] **Migration 001: Initial Schema**
  - File: `supabase/migrations/001_initial_schema.sql`
  - Creates: organizations, profiles, cases, reviews, case_results, notifications, audit_logs tables
  - Creates: Indexes and initial RLS policies
  - **Verify**: Check Tables section - should see all 7 tables

- [ ] **Migration 002: Seed Data (Organizations)**
  - File: `supabase/migrations/002_seed_data.sql`
  - Creates: 2 demo organizations (Alpha Spine Institute, Beta Health System)
  - **Verify**: Run `SELECT * FROM organizations;` - should see 2 rows

- [ ] **Migration 003: Storage Bucket**
  - File: `supabase/migrations/003_storage_bucket.sql`
  - Creates: `case-imaging` storage bucket for file uploads
  - **Verify**: Go to Storage section - should see `case-imaging` bucket

- [ ] **Migration 004: Review Workflow Policies**
  - File: `supabase/migrations/004_review_workflow_policies.sql`
  - Creates: Additional RLS policies for review workflow
  - **Verify**: No errors in SQL Editor

- [ ] **Migration 005: Comprehensive Seed Data**
  - File: `supabase/migrations/005_comprehensive_seed_data.sql`
  - Creates: Helper functions (`create_demo_profile`, `create_demo_cases`)
  - **Verify**: Run `SELECT create_demo_profile;` - should see function exists

- [ ] **Migration 006: Admin RLS Policies**
  - File: `supabase/migrations/006_admin_rls_policies.sql`
  - Creates: RLS policies for admin user/org management
  - **Verify**: No errors in SQL Editor

---

## 3. Create Demo Users (Authentication)

**Location**: Supabase Dashboard → Authentication → Users

For each user below, click "Add User" and:
- Enter email
- Enter password (e.g., `Demo2024!`)
- ✅ Check "Auto Confirm User"
- Click "Create User"
- **Copy the User UUID** (you'll need it for Step 4)

- [ ] `sysadmin@demo.io` → Copy UUID: `_________________`
- [ ] `admin@alphaspine.io` → Copy UUID: `_________________`
- [ ] `admin@betahealth.io` → Copy UUID: `_________________`
- [ ] `clinician@alphaspine.io` → Copy UUID: `_________________`
- [ ] `clinician@betahealth.io` → Copy UUID: `_________________`
- [ ] `expert1@demo.io` → Copy UUID: `_________________`
- [ ] `expert2@demo.io` → Copy UUID: `_________________`
- [ ] `expert3@demo.io` → Copy UUID: `_________________`
- [ ] `expert4@demo.io` → Copy UUID: `_________________`
- [ ] `expert5@demo.io` → Copy UUID: `_________________`

**Optional**: Create more expert reviewers (expert6-15) if you want more test data.

---

## 4. Create User Profiles (Database)

**Location**: Supabase Dashboard → SQL Editor

Run the following SQL, replacing `<UUID>` with the actual UUIDs from Step 3.

**First, get the organization IDs:**
```sql
SELECT id, name FROM organizations;
```
- Copy Alpha Spine ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (or actual UUID)
- Copy Beta Health ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` (or actual UUID)

**Then create profiles:**

- [ ] **System Admin**
  ```sql
  SELECT create_demo_profile(
    '<sysadmin-uuid>', 
    'sysadmin@demo.io', 
    'System Administrator', 
    'SYS_ADMIN', 
    '<alpha-org-id>',
    false
  );
  ```

- [ ] **Org Admin (Alpha Spine)**
  ```sql
  SELECT create_demo_profile(
    '<admin-alphaspine-uuid>', 
    'admin@alphaspine.io', 
    'Dr. Alice Admin', 
    'ORG_ADMIN', 
    '<alpha-org-id>',
    false
  );
  ```

- [ ] **Org Admin (Beta Health)**
  ```sql
  SELECT create_demo_profile(
    '<admin-betahealth-uuid>', 
    'admin@betahealth.io', 
    'Dr. Bob Boss', 
    'ORG_ADMIN', 
    '<beta-org-id>',
    false
  );
  ```

- [ ] **Clinician (Alpha Spine)**
  ```sql
  SELECT create_demo_profile(
    '<clinician-alphaspine-uuid>', 
    'clinician@alphaspine.io', 
    'Dr. Charles Clinician', 
    'CLINICIAN', 
    '<alpha-org-id>',
    false
  );
  ```

- [ ] **Clinician (Beta Health)**
  ```sql
  SELECT create_demo_profile(
    '<clinician-betahealth-uuid>', 
    'clinician@betahealth.io', 
    'Dr. Diana Doctor', 
    'CLINICIAN', 
    '<beta-org-id>',
    false
  );
  ```

- [ ] **Expert Reviewers (5 minimum, create all 5)**
  ```sql
  SELECT create_demo_profile('<expert1-uuid>', 'expert1@demo.io', 'Dr. Expert One', 'EXPERT_REVIEWER', '<beta-org-id>', true);
  SELECT create_demo_profile('<expert2-uuid>', 'expert2@demo.io', 'Dr. Expert Two', 'EXPERT_REVIEWER', '<beta-org-id>', true);
  SELECT create_demo_profile('<expert3-uuid>', 'expert3@demo.io', 'Dr. Expert Three', 'EXPERT_REVIEWER', '<beta-org-id>', true);
  SELECT create_demo_profile('<expert4-uuid>', 'expert4@demo.io', 'Dr. Expert Four', 'EXPERT_REVIEWER', '<beta-org-id>', true);
  SELECT create_demo_profile('<expert5-uuid>', 'expert5@demo.io', 'Dr. Expert Five', 'EXPERT_REVIEWER', '<beta-org-id>', true);
  ```

**Verify profiles created:**
```sql
SELECT email, full_name, role, org_id, is_expert_certified FROM profiles;
```
Should see all 10+ profiles.

---

## 5. Create Demo Cases

**Location**: Supabase Dashboard → SQL Editor

- [ ] **Run seed cases function**
  ```sql
  SELECT create_demo_cases();
  ```

**Verify cases created:**
```sql
SELECT id, status, submitter_id, created_at FROM cases ORDER BY created_at DESC;
```
Should see at least 3 cases (1 DRAFT, 1 UNDER_REVIEW, 1 COMPLETED).

**Verify reviews assigned:**
```sql
SELECT case_id, reviewer_id, status FROM reviews;
```
Should see reviews for the UNDER_REVIEW and COMPLETED cases.

---

## 6. Install Dependencies & Verify Build

- [ ] **Install npm packages**
  ```bash
  cd /Users/sahilkapadia/Downloads/First-Principles
  npm install
  ```

- [ ] **Verify TypeScript compilation**
  ```bash
  npm run build
  ```
  Should complete without errors.

---

## 7. Start Development Server

- [ ] **Start the dev server**
  ```bash
  npm run dev
  ```

- [ ] **Verify server is running**
  - Open [http://localhost:3000](http://localhost:3000)
  - Should see login page

---

## 8. Test Login & Basic Functionality

- [ ] **Test System Admin Login**
  - Email: `sysadmin@demo.io`
  - Password: `Demo2024!` (or your chosen password)
  - Should see dashboard with admin navigation
  - Navigate to Admin → Users (should see all users)
  - Navigate to Admin → Organizations (should see all orgs)

- [ ] **Test Org Admin Login**
  - Email: `admin@alphaspine.io`
  - Password: `Demo2024!`
  - Should see dashboard
  - Navigate to Admin → Users (should only see Alpha Spine users)

- [ ] **Test Clinician Login**
  - Email: `clinician@alphaspine.io`
  - Password: `Demo2024!`
  - Should see dashboard with case stats
  - Navigate to Cases → should see existing cases
  - Try creating a new case

- [ ] **Test Expert Reviewer Login**
  - Email: `expert1@demo.io`
  - Password: `Demo2024!`
  - Should see dashboard with pending reviews count
  - Navigate to Reviews → should see assigned reviews
  - Click a review → should see review form
  - Navigate to Reviews → Performance → should see metrics

---

## 9. Verify Notifications

- [ ] **Check notification bell**
  - Login as any user
  - Look for bell icon in top navigation
  - Should show unread count if notifications exist

- [ ] **Test notifications page**
  - Navigate to `/notifications`
  - Should see list of notifications
  - Click a notification → should navigate to relevant page

---

## 10. Final Verification Queries

Run these in Supabase SQL Editor to verify everything:

- [ ] **Check all tables have data**
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

- [ ] **Verify RLS policies are active**
  ```sql
  SELECT schemaname, tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
  ```
  Should see multiple policies per table.

- [ ] **Check storage bucket exists**
  - Go to Storage section in Supabase Dashboard
  - Should see `case-imaging` bucket with public access

---

## Troubleshooting

### "Profile not found" after login
- User exists in auth but no profile in database
- Run: `SELECT create_demo_profile('<uuid>', 'email@example.com', 'Name', 'CLINICIAN', '<org-id>', false);`

### "Not enough expert reviewers"
- Need at least 5 certified expert reviewers
- Verify: `SELECT COUNT(*) FROM profiles WHERE role = 'EXPERT_REVIEWER' AND is_expert_certified = true;`
- Should return 5 or more

### Build errors
- Check `.env.local` has correct values
- Run `npm install` again
- Check Node.js version: `node --version` (should be 18+)

### Database connection errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Check Supabase project is active (not paused)
- Verify network connectivity

---

## ✅ Setup Complete!

Once all items are checked, your application is ready to use. You can now:
- Test the full case submission → review → aggregation workflow
- Manage users and organizations as admin
- View performance metrics as a reviewer
- Test notifications and real-time updates

**Next Steps:**
- Explore different user roles and their capabilities
- Submit test cases and complete reviews
- Check the reviewer performance metrics
- Test admin management features

