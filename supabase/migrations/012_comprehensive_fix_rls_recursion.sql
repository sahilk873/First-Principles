-- ============================================
-- COMPREHENSIVE FIX FOR ALL RLS RECURSION ISSUES
-- ============================================
-- This migration fixes all infinite recursion issues in RLS policies
-- by using SECURITY DEFINER helper functions to bypass RLS checks.

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Function to check if user can create cases (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_user_create_cases(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role IN ('CLINICIAN', 'ORG_ADMIN', 'SYS_ADMIN')
    );
$$;

-- Function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role IN ('ORG_ADMIN', 'SYS_ADMIN')
    );
$$;

-- Function to check if user is sys admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_sys_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role = 'SYS_ADMIN'
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_create_cases(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_sys_admin(UUID) TO authenticated;

-- ============================================
-- FIX CASES TABLE POLICIES
-- ============================================

-- Fix "Org members can view org cases"
DROP POLICY IF EXISTS "Org members can view org cases" ON public.cases;
CREATE POLICY "Org members can view org cases"
    ON public.cases FOR SELECT
    USING (
        org_id = public.get_user_org_id(auth.uid())
    );

-- Fix "Clinicians can create cases"
DROP POLICY IF EXISTS "Clinicians can create cases" ON public.cases;
CREATE POLICY "Clinicians can create cases"
    ON public.cases FOR INSERT
    WITH CHECK (
        submitter_id = auth.uid() AND
        public.can_user_create_cases(auth.uid())
    );

-- ============================================
-- FIX REVIEWS TABLE POLICIES
-- ============================================

-- Fix "Org admins can view org reviews" - this policy joins profiles and cases
DROP POLICY IF EXISTS "Org admins can view org reviews" ON public.reviews;
CREATE POLICY "Org admins can view org reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (
        public.is_user_admin(auth.uid()) AND
        case_id IN (
            SELECT id FROM public.cases 
            WHERE org_id = public.get_user_org_id(auth.uid())
        )
    );

-- Fix "Sys admins can view all reviews"
DROP POLICY IF EXISTS "Sys admins can view all reviews" ON public.reviews;
CREATE POLICY "Sys admins can view all reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (
        public.is_user_sys_admin(auth.uid())
    );

-- ============================================
-- FIX CASE_RESULTS TABLE POLICIES
-- ============================================

-- Fix "Org members can view case results"
DROP POLICY IF EXISTS "Org members can view case results" ON public.case_results;
CREATE POLICY "Org members can view case results"
    ON public.case_results FOR SELECT
    USING (
        case_id IN (
            SELECT id FROM public.cases 
            WHERE org_id = public.get_user_org_id(auth.uid())
        )
    );

-- ============================================
-- FIX ORGANIZATIONS TABLE POLICIES
-- ============================================

-- Fix "Users can view their own organization"
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (
        id = public.get_user_org_id(auth.uid())
    );

-- ============================================
-- FIX AUDIT_LOGS TABLE POLICIES
-- ============================================

-- Fix "Admins can view audit logs"
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.is_user_admin(auth.uid())
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.get_user_org_id(UUID) IS 'Helper function to get user org_id without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';
COMMENT ON FUNCTION public.can_user_create_cases(UUID) IS 'Helper function to check if user can create cases without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';
COMMENT ON FUNCTION public.is_user_admin(UUID) IS 'Helper function to check if user is admin without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';
COMMENT ON FUNCTION public.is_user_sys_admin(UUID) IS 'Helper function to check if user is sys admin without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';

