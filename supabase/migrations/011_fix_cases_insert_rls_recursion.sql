-- ============================================
-- FIX INFINITE RECURSION IN CASES INSERT RLS POLICY
-- ============================================
-- The issue: The "Clinicians can create cases" policy queries profiles table
-- which can cause infinite recursion when RLS is enabled on profiles.
-- 
-- Solution: Use a SECURITY DEFINER function to bypass RLS when checking user role.

-- Create helper function to check if user can create cases (bypasses RLS to avoid recursion)
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

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_create_cases(UUID) TO authenticated;

-- Drop and recreate "Clinicians can create cases" using the function
DROP POLICY IF EXISTS "Clinicians can create cases" ON public.cases;

CREATE POLICY "Clinicians can create cases"
    ON public.cases FOR INSERT
    WITH CHECK (
        submitter_id = auth.uid() AND
        public.can_user_create_cases(auth.uid())
    );

COMMENT ON FUNCTION public.can_user_create_cases(UUID) IS 'Helper function to check if user can create cases without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS checks.';

