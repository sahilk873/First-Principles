-- Verification Queries for First Principles Setup
-- Run these after executing all migrations and creating profiles

-- 1. Check all tables exist
SELECT 'Tables Check' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('organizations', 'profiles', 'cases', 'reviews', 'case_results', 'notifications', 'audit_logs');

-- 2. Check organizations
SELECT 'Organizations' as check_type, COUNT(*) as count, string_agg(name, ', ') as names
FROM organizations;

-- 3. Check profiles (should have at least 10)
SELECT 'Profiles' as check_type, 
       COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE role = 'SYS_ADMIN') as sys_admin_count,
       COUNT(*) FILTER (WHERE role = 'ORG_ADMIN') as org_admin_count,
       COUNT(*) FILTER (WHERE role = 'CLINICIAN') as clinician_count,
       COUNT(*) FILTER (WHERE role = 'EXPERT_REVIEWER' AND is_expert_certified = true) as expert_reviewer_count
FROM profiles;

-- 4. Check cases
SELECT 'Cases' as check_type, 
       COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_count,
       COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review_count,
       COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count
FROM cases;

-- 5. Check reviews
SELECT 'Reviews' as check_type, 
       COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE status = 'ASSIGNED') as assigned_count,
       COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
       COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_count
FROM reviews;

-- 6. Check case results
SELECT 'Case Results' as check_type, COUNT(*) as count FROM case_results;

-- 7. Check notifications
SELECT 'Notifications' as check_type, COUNT(*) as total_count, COUNT(*) FILTER (WHERE is_read = false) as unread_count FROM notifications;

-- 8. Check storage bucket (if accessible)
SELECT 'Storage Buckets' as check_type, COUNT(*) as count 
FROM storage.buckets 
WHERE id = 'imaging';

-- 9. Verify helper functions exist
SELECT 'Functions' as check_type,
       COUNT(*) FILTER (WHERE routine_name = 'create_demo_profile') as create_demo_profile_exists,
       COUNT(*) FILTER (WHERE routine_name = 'create_demo_cases') as create_demo_cases_exists
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_demo_profile', 'create_demo_cases');

-- 10. Check RLS policies
SELECT 'RLS Policies' as check_type, COUNT(DISTINCT tablename) as tables_with_policies, COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Detailed profile list
SELECT 'Profile Details' as check_type, email, name, role, is_expert_certified 
FROM profiles 
ORDER BY role, email;

