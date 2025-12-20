-- ============================================
-- Database State Check Queries
-- ============================================
-- Run these in Supabase Dashboard → SQL Editor
-- to check the current state of your database

-- ============================================
-- 1. CHECK TABLES EXIST
-- ============================================
SELECT 
    'Tables Check' as check_type, 
    COUNT(*) as count,
    string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('organizations', 'profiles', 'cases', 'reviews', 'case_results', 'notifications', 'audit_logs');

-- ============================================
-- 2. CHECK ORGANIZATIONS
-- ============================================
SELECT 
    'Organizations' as check_type, 
    COUNT(*) as count, 
    string_agg(name, ', ' ORDER BY name) as names
FROM organizations;

-- ============================================
-- 3. CHECK PROFILES
-- ============================================
SELECT 
    'Profiles' as check_type, 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE role = 'SYS_ADMIN') as sys_admin_count,
    COUNT(*) FILTER (WHERE role = 'ORG_ADMIN') as org_admin_count,
    COUNT(*) FILTER (WHERE role = 'CLINICIAN') as clinician_count,
    COUNT(*) FILTER (WHERE role = 'EXPERT_REVIEWER') as expert_reviewer_count,
    COUNT(*) FILTER (WHERE role = 'EXPERT_REVIEWER' AND is_expert_certified = true) as certified_expert_count
FROM profiles;

-- ============================================
-- 4. CHECK CASES
-- ============================================
SELECT 
    'Cases' as check_type, 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_count,
    COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_count,
    COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review_count,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
FROM cases;

-- ============================================
-- 5. CHECK REVIEWS
-- ============================================
SELECT 
    'Reviews' as check_type, 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'ASSIGNED') as assigned_count,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_count
FROM reviews;

-- ============================================
-- 6. CHECK CASE RESULTS
-- ============================================
SELECT 
    'Case Results' as check_type, 
    COUNT(*) as count 
FROM case_results;

-- ============================================
-- 7. CHECK NOTIFICATIONS
-- ============================================
SELECT 
    'Notifications' as check_type, 
    COUNT(*) as total_count, 
    COUNT(*) FILTER (WHERE is_read = false) as unread_count 
FROM notifications;

-- ============================================
-- 8. CHECK RLS POLICIES
-- ============================================
SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 9. CHECK HELPER FUNCTIONS (for RLS fixes)
-- ============================================
SELECT 
    'Helper Functions' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_org_id',
    'can_user_create_cases',
    'is_user_admin',
    'is_user_sys_admin'
  )
ORDER BY routine_name;

-- ============================================
-- 10. CHECK MIGRATIONS APPLIED (via function existence)
-- ============================================
SELECT 
    'Migration Functions' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_demo_profile')
        THEN 'Migration 005: ✓ Applied'
        ELSE 'Migration 005: ✗ Not Applied'
    END as migration_005,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_org_id')
        THEN 'Migration 010/012: ✓ Applied'
        ELSE 'Migration 010/012: ✗ Not Applied'
    END as migration_010_012,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'can_user_create_cases')
        THEN 'Migration 011/012: ✓ Applied'
        ELSE 'Migration 011/012: ✗ Not Applied'
    END as migration_011_012;

-- ============================================
-- 11. CHECK STORAGE BUCKET
-- ============================================
SELECT 
    'Storage Buckets' as check_type, 
    COUNT(*) as count,
    string_agg(id, ', ') as bucket_names
FROM storage.buckets 
WHERE id = 'imaging';

-- ============================================
-- 12. CHECK FOR RLS RECURSION ISSUES
-- ============================================
-- Check if policies are using helper functions (good) or direct queries (bad)
SELECT 
    'RLS Policy Analysis' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN definition LIKE '%get_user_org_id%' OR 
             definition LIKE '%can_user_create_cases%' OR
             definition LIKE '%is_user_admin%' OR
             definition LIKE '%is_user_sys_admin%'
        THEN '✓ Using helper function'
        WHEN definition LIKE '%FROM public.profiles%' AND tablename != 'profiles'
        THEN '⚠️ Direct profiles query (may cause recursion)'
        ELSE '✓ Safe'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('cases', 'reviews', 'case_results', 'organizations', 'audit_logs')
ORDER BY tablename, policyname;





