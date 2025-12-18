-- ============================================
-- ADMIN RLS POLICIES
-- ============================================
-- Additional RLS policies for admin management functionality
-- Run this after 001_initial_schema.sql

-- ============================================
-- PROFILES TABLE - Admin Update Policies
-- ============================================

-- ORG_ADMIN can update profiles in their organization
CREATE POLICY "Org admins can update profiles in their org"
    ON public.profiles FOR UPDATE
    USING (
        -- Target user must be in same org as admin
        org_id IN (
            SELECT p.org_id FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'ORG_ADMIN'
        )
        -- Target user cannot be SYS_ADMIN
        AND role != 'SYS_ADMIN'
    )
    WITH CHECK (
        org_id IN (
            SELECT p.org_id FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'ORG_ADMIN'
        )
        AND role IN ('CLINICIAN', 'EXPERT_REVIEWER')
    );

-- SYS_ADMIN can update any profile
CREATE POLICY "Sys admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    );

-- SYS_ADMIN can read all profiles
CREATE POLICY "Sys admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    );

-- ============================================
-- ORGANIZATIONS TABLE - Admin Policies
-- ============================================

-- SYS_ADMIN can read all organizations
CREATE POLICY "Sys admins can view all organizations"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    );

-- SYS_ADMIN can create organizations
CREATE POLICY "Sys admins can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    );

-- SYS_ADMIN can update organizations
CREATE POLICY "Sys admins can update organizations"
    ON public.organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'SYS_ADMIN'
        )
    );

-- ============================================
-- NOTIFICATIONS TABLE - User Policies
-- ============================================

-- Service role can insert notifications (for server actions)
CREATE POLICY "Service role can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
-- This policy may already exist, but we ensure it
-- CREATE POLICY IF NOT EXISTS doesn't work, so we just try

-- ============================================
-- CASE RESULTS TABLE - Additional Policies
-- ============================================

-- Service role can insert case results
CREATE POLICY "Service role can insert case results"
    ON public.case_results FOR INSERT
    WITH CHECK (true);

-- ============================================
-- REVIEWS TABLE - Additional Policies
-- ============================================

-- Service role can insert reviews (for assignment)
CREATE POLICY "Service role can insert reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (true);

-- ============================================
-- CASES TABLE - Additional Policies
-- ============================================

-- Service role can update cases (for status changes)
CREATE POLICY "Service role can update cases"
    ON public.cases FOR UPDATE
    USING (true)
    WITH CHECK (true);

