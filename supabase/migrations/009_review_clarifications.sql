-- Migration: Add review clarifications table for post-review chat flow
-- This table stores clarification messages between reviewers and the system/clinicians

-- Create the review_clarifications table
CREATE TABLE IF NOT EXISTS review_clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('SYSTEM', 'REVIEWER', 'CLINICIAN')),
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('QUESTION', 'ANSWER', 'INFO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by review_id
CREATE INDEX IF NOT EXISTS idx_review_clarifications_review_id ON review_clarifications(review_id);

-- Add index for faster lookups by created_at for ordering
CREATE INDEX IF NOT EXISTS idx_review_clarifications_created_at ON review_clarifications(created_at);

-- Add clarification_completed flag to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS clarification_completed BOOLEAN DEFAULT FALSE;

-- Enable RLS on review_clarifications
ALTER TABLE review_clarifications ENABLE ROW LEVEL SECURITY;

-- Policy: Reviewers can read clarifications for their own reviews
CREATE POLICY review_clarifications_reviewer_select ON review_clarifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM reviews r
            WHERE r.id = review_clarifications.review_id
            AND r.reviewer_id = auth.uid()
        )
    );

-- Policy: Clinicians can read clarifications for cases they submitted
CREATE POLICY review_clarifications_clinician_select ON review_clarifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM reviews r
            JOIN cases c ON c.id = r.case_id
            WHERE r.id = review_clarifications.review_id
            AND c.submitter_id = auth.uid()
        )
    );

-- Policy: Reviewers can insert their own clarification responses
CREATE POLICY review_clarifications_reviewer_insert ON review_clarifications
    FOR INSERT
    WITH CHECK (
        sender_type = 'REVIEWER'
        AND sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM reviews r
            WHERE r.id = review_clarifications.review_id
            AND r.reviewer_id = auth.uid()
        )
    );

-- Policy: Clinicians can insert questions
CREATE POLICY review_clarifications_clinician_insert ON review_clarifications
    FOR INSERT
    WITH CHECK (
        sender_type = 'CLINICIAN'
        AND sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM reviews r
            JOIN cases c ON c.id = r.case_id
            WHERE r.id = review_clarifications.review_id
            AND c.submitter_id = auth.uid()
        )
    );

-- Policy: System can insert questions (via service role)
CREATE POLICY review_clarifications_system_insert ON review_clarifications
    FOR INSERT
    WITH CHECK (
        sender_type = 'SYSTEM'
        AND sender_id IS NULL
    );

-- Policy: Admins can read all clarifications
CREATE POLICY review_clarifications_admin_select ON review_clarifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('SYS_ADMIN', 'ORG_ADMIN')
        )
    );

-- Add new notification types
-- Note: This assumes the notifications table allows for new types
-- Update the type check constraint if it exists

-- Grant permissions
GRANT SELECT, INSERT ON review_clarifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE review_clarifications IS 'Stores clarification messages between reviewers, system, and clinicians for post-review discussion';
COMMENT ON COLUMN review_clarifications.sender_type IS 'Type of sender: SYSTEM (auto-generated questions), REVIEWER, or CLINICIAN';
COMMENT ON COLUMN review_clarifications.message_type IS 'Type of message: QUESTION, ANSWER, or INFO';

