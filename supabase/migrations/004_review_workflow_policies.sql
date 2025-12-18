-- Migration: 004_review_workflow_policies
-- Description: Additional RLS policies for the review and case workflow

-- ============================================
-- REVIEWS TABLE POLICIES
-- ============================================

-- Policy: Allow inserting reviews (for assignment)
-- This is typically done via a service role, but we add this for completeness
CREATE POLICY "System can insert reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Org admins can view reviews for their org's cases
CREATE POLICY "Org admins can view org reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.cases c ON c.org_id = p.org_id
        WHERE p.id = auth.uid()
        AND p.role IN ('ORG_ADMIN', 'SYS_ADMIN')
        AND c.id = case_id
    )
);

-- Policy: Sys admins can view all reviews
CREATE POLICY "Sys admins can view all reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SYS_ADMIN'
    )
);

-- ============================================
-- CASES TABLE POLICIES
-- ============================================

-- Policy: Allow updating case status during review workflow
CREATE POLICY "System can update case status"
ON public.cases FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- CASE_RESULTS TABLE POLICIES
-- ============================================

-- Policy: Allow inserting case results
CREATE POLICY "System can insert case results"
ON public.case_results FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Expert reviewers can view results for cases they reviewed
CREATE POLICY "Reviewers can view case results"
ON public.case_results FOR SELECT
TO authenticated
USING (
    case_id IN (
        SELECT case_id FROM public.reviews 
        WHERE reviewer_id = auth.uid()
    )
);

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Policy: Allow reading any profile for expert selection
CREATE POLICY "Sys admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SYS_ADMIN'
    )
);

-- Policy: Expert reviewers can be queried for assignment
CREATE POLICY "System can query expert reviewers"
ON public.profiles FOR SELECT
TO authenticated
USING (role = 'EXPERT_REVIEWER');

