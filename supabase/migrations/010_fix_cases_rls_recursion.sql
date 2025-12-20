-- ============================================
-- FIX INFINITE RECURSION IN CASES RLS POLICIES
-- ============================================
-- The issue: Policies that query profiles/other tables from within cases policies
-- can cause infinite recursion when queries involve joins.
-- 
-- Solution: Use SECURITY DEFINER functions to bypass RLS when checking related tables.
-- Since profiles RLS is disabled (migration 008), we could query directly,
-- but using functions is safer and more explicit.

-- Create helper function to get user org_id (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;

-- Drop and recreate "Org members can view org cases" using the function
DROP POLICY IF EXISTS "Org members can view org cases" ON public.cases;

CREATE POLICY "Org members can view org cases"
    ON public.cases FOR SELECT
    USING (
        org_id = public.get_user_org_id(auth.uid())
    );

-- Fix case_results policies to avoid recursion
DROP POLICY IF EXISTS "Submitters can view case results" ON public.case_results;
DROP POLICY IF EXISTS "Org members can view case results" ON public.case_results;

CREATE POLICY "Submitters can view case results"
    ON public.case_results FOR SELECT
    USING (
        case_id IN (
            SELECT id FROM public.cases 
            WHERE submitter_id = auth.uid()
        )
    );

CREATE POLICY "Org members can view case results"
    ON public.case_results FOR SELECT
    USING (
        case_id IN (
            SELECT id FROM public.cases 
            WHERE org_id = public.get_user_org_id(auth.uid())
        )
    );

COMMENT ON FUNCTION public.get_user_org_id(UUID) IS 'Helper function to get user org_id without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';

