-- First Principles Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all core tables for the First Principles application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hospital', 'private_practice', 'aco', 'other')),
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for organization lookups
CREATE INDEX idx_organizations_type ON public.organizations(type);
CREATE INDEX idx_organizations_region ON public.organizations(region);

-- ============================================
-- 2. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CLINICIAN', 'EXPERT_REVIEWER', 'ORG_ADMIN', 'SYS_ADMIN')),
    npi_number TEXT,
    specialties JSONB DEFAULT '[]'::jsonb,
    is_expert_certified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profile lookups
CREATE INDEX idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_expert_certified ON public.profiles(is_expert_certified);

-- ============================================
-- 3. CASES TABLE
-- ============================================
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    submitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'FAILED')),
    patient_pseudo_id TEXT NOT NULL,
    anatomy_region TEXT NOT NULL CHECK (anatomy_region IN ('LUMBAR', 'CERVICAL', 'THORACIC', 'OTHER')),
    diagnosis_codes JSONB DEFAULT '[]'::jsonb,
    proposed_procedure_codes JSONB DEFAULT '[]'::jsonb,
    symptom_profile JSONB DEFAULT '{}'::jsonb,
    neuro_deficits JSONB DEFAULT '{}'::jsonb,
    prior_surgery BOOLEAN DEFAULT FALSE,
    prior_surgery_details TEXT,
    comorbidities JSONB DEFAULT '{}'::jsonb,
    conservative_care JSONB DEFAULT '{}'::jsonb,
    free_text_summary TEXT,
    imaging_paths JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for case lookups
CREATE INDEX idx_cases_org_id ON public.cases(org_id);
CREATE INDEX idx_cases_submitter_id ON public.cases(submitter_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_anatomy_region ON public.cases(anatomy_region);
CREATE INDEX idx_cases_submitted_at ON public.cases(submitted_at);
CREATE INDEX idx_cases_created_at ON public.cases(created_at);

-- ============================================
-- 4. REVIEWS TABLE
-- ============================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
    surgery_indicated BOOLEAN,
    fusion_indicated BOOLEAN,
    preferred_approach TEXT CHECK (preferred_approach IN ('DECOMPRESSION_ONLY', 'PLF', 'TLIF', 'ALIF', 'OTHER')),
    appropriateness_score INTEGER CHECK (appropriateness_score BETWEEN 1 AND 9),
    successful_outcome_likely BOOLEAN,
    optimization_recommended BOOLEAN,
    missing_data_flag BOOLEAN,
    missing_data_description TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for review lookups
CREATE INDEX idx_reviews_case_id ON public.reviews(case_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);

-- Unique constraint: one reviewer per case
CREATE UNIQUE INDEX idx_reviews_case_reviewer ON public.reviews(case_id, reviewer_id);

-- ============================================
-- 5. CASE_RESULTS TABLE
-- ============================================
CREATE TABLE public.case_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
    final_class TEXT NOT NULL CHECK (final_class IN ('APPROPRIATE', 'UNCERTAIN', 'INAPPROPRIATE')),
    mean_score NUMERIC,
    score_std_dev NUMERIC,
    num_reviews INTEGER,
    percent_agreed_with_proposed NUMERIC,
    percent_recommended_alternative NUMERIC,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for case_results lookups
CREATE INDEX idx_case_results_case_id ON public.case_results(case_id);
CREATE INDEX idx_case_results_final_class ON public.case_results(final_class);

-- ============================================
-- 6. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CASE_ASSIGNED', 'CASE_RESULT_READY', 'REVIEW_REMINDER', 'SYSTEM_MESSAGE')),
    payload JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes for notification lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- ============================================
-- 7. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs lookups
CREATE INDEX idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_target_type ON public.audit_logs(target_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can read orgs they belong to
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Profiles: Users can read their own profile and profiles in their org
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their org"
    ON public.profiles FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Cases: Clinicians can manage their own cases, org members can view
CREATE POLICY "Submitters can view own cases"
    ON public.cases FOR SELECT
    USING (submitter_id = auth.uid());

CREATE POLICY "Org members can view org cases"
    ON public.cases FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Expert reviewers can view assigned cases"
    ON public.cases FOR SELECT
    USING (
        id IN (
            SELECT case_id FROM public.reviews WHERE reviewer_id = auth.uid()
        )
    );

CREATE POLICY "Clinicians can create cases"
    ON public.cases FOR INSERT
    WITH CHECK (
        submitter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('CLINICIAN', 'ORG_ADMIN', 'SYS_ADMIN')
        )
    );

CREATE POLICY "Submitters can update own draft cases"
    ON public.cases FOR UPDATE
    USING (submitter_id = auth.uid() AND status = 'DRAFT')
    WITH CHECK (submitter_id = auth.uid());

-- Reviews: Reviewers can manage their own reviews
CREATE POLICY "Reviewers can view own reviews"
    ON public.reviews FOR SELECT
    USING (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update own reviews"
    ON public.reviews FOR UPDATE
    USING (reviewer_id = auth.uid() AND status IN ('ASSIGNED', 'IN_PROGRESS'))
    WITH CHECK (reviewer_id = auth.uid());

-- Case Results: Accessible to case submitter and org
CREATE POLICY "Submitters can view case results"
    ON public.case_results FOR SELECT
    USING (
        case_id IN (
            SELECT id FROM public.cases WHERE submitter_id = auth.uid()
        )
    );

CREATE POLICY "Org members can view case results"
    ON public.case_results FOR SELECT
    USING (
        case_id IN (
            SELECT c.id FROM public.cases c
            JOIN public.profiles p ON p.org_id = c.org_id
            WHERE p.id = auth.uid()
        )
    );

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Audit Logs: Read only for org admins and sys admins
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('ORG_ADMIN', 'SYS_ADMIN')
        )
    );

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.organizations IS 'Healthcare organizations using First Principles';
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.cases IS 'Spine surgery cases submitted for review';
COMMENT ON TABLE public.reviews IS 'Expert reviews of submitted cases';
COMMENT ON TABLE public.case_results IS 'Aggregated results after all reviews complete';
COMMENT ON TABLE public.notifications IS 'User notifications for case updates';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for compliance and debugging';

