-- ============================================
-- FIX CASES/REVIEWS RLS RECURSION
-- ============================================
-- Queries against the cases table triggered the policy
-- "Expert reviewers can view assigned cases", which selected
-- from the reviews table. The reviews policies in turn query
-- the cases table, producing an infinite recursion error.
--
-- This migration introduces a SECURITY DEFINER helper function
-- for checking review assignments so the cases policy can avoid
-- querying the reviews table directly.

-- Create helper function to check if a reviewer is assigned
CREATE OR REPLACE FUNCTION public.is_reviewer_assigned_to_case(
    p_reviewer_id UUID,
    p_case_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.reviews r
        WHERE r.reviewer_id = p_reviewer_id
          AND r.case_id = p_case_id
    );
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_reviewer_assigned_to_case(UUID, UUID) TO authenticated;

-- Recreate policy using the helper function
DROP POLICY IF EXISTS "Expert reviewers can view assigned cases" ON public.cases;

CREATE POLICY "Expert reviewers can view assigned cases"
    ON public.cases FOR SELECT
    USING (
        public.is_reviewer_assigned_to_case(auth.uid(), id)
    );

COMMENT ON FUNCTION public.is_reviewer_assigned_to_case(UUID, UUID) IS
    'Checks if a reviewer is assigned to a case without triggering RLS recursion. Runs as SECURITY DEFINER.';
