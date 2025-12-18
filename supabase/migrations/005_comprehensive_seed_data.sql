-- ============================================
-- COMPREHENSIVE SEED DATA FOR FIRST PRINCIPLES
-- ============================================
-- This script creates demo data for testing the complete workflow
-- Run this AFTER running the initial schema migrations
-- 
-- IMPORTANT: You must first create auth users through Supabase Auth
-- before running this script. See README for instructions.
-- ============================================

-- ============================================
-- 1. ORGANIZATIONS (2 orgs for multi-tenancy testing)
-- ============================================

INSERT INTO public.organizations (id, name, type, region) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alpha Spine Institute', 'hospital', 'Northeast'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Health System', 'aco', 'West Coast')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  region = EXCLUDED.region;

-- ============================================
-- 2. PROFILES TEMPLATE
-- ============================================
-- NOTE: The IDs below are placeholders. You MUST replace them with actual
-- auth.users UUIDs from your Supabase project after creating auth accounts.
-- 
-- QUICK SETUP GUIDE:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create users with the emails listed below (or your own)
-- 3. Copy the UUID of each created user
-- 4. Update the id fields in this script to match
-- 5. Run this script in the SQL Editor
--
-- Alternatively, run the helper script below to create profiles
-- after manually creating auth users.

-- SYSTEM ADMIN (1 user)
-- INSERT INTO public.profiles (id, org_id, email, name, role, npi_number, specialties, is_expert_certified) VALUES
--   ('<SYS_ADMIN_AUTH_USER_ID>', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sysadmin@firstprinciples.io', 'System Administrator', 'SYS_ADMIN', NULL, '[]'::jsonb, false);

-- ALPHA SPINE INSTITUTE USERS
-- INSERT INTO public.profiles (id, org_id, email, name, role, npi_number, specialties, is_expert_certified) VALUES
--   ('<ORG_ADMIN_1_AUTH_USER_ID>', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@alphaspine.io', 'Dr. Alice Admin', 'ORG_ADMIN', '1111111111', '["Orthopedic Surgery"]'::jsonb, false),
--   ('<CLINICIAN_1_AUTH_USER_ID>', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'clinician1@alphaspine.io', 'Dr. Charles Clinician', 'CLINICIAN', '2222222222', '["Spine Surgery"]'::jsonb, false),
--   ('<CLINICIAN_2_AUTH_USER_ID>', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'clinician2@alphaspine.io', 'Dr. Diana Doctor', 'CLINICIAN', '3333333333', '["Neurosurgery"]'::jsonb, false);

-- ALPHA SPINE EXPERT REVIEWERS (15 experts)
-- Note: In production, these would be from external organizations for blinding purposes

-- BETA HEALTH SYSTEM USERS
-- INSERT INTO public.profiles (id, org_id, email, name, role, npi_number, specialties, is_expert_certified) VALUES
--   ('<ORG_ADMIN_2_AUTH_USER_ID>', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@betahealth.io', 'Dr. Bob Boss', 'ORG_ADMIN', '4444444444', '["Hospital Administration"]'::jsonb, false),
--   ('<CLINICIAN_3_AUTH_USER_ID>', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'clinician3@betahealth.io', 'Dr. Emily Expert', 'CLINICIAN', '5555555555', '["Orthopedic Surgery"]'::jsonb, false),
--   ('<CLINICIAN_4_AUTH_USER_ID>', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'clinician4@betahealth.io', 'Dr. Frank Fellow', 'CLINICIAN', '6666666666', '["Spine Surgery"]'::jsonb, false);

-- ============================================
-- 3. HELPER FUNCTION: Create profile for auth user
-- ============================================
-- Use this after creating an auth user to easily create their profile
-- Example usage:
-- SELECT create_demo_profile(
--   '<auth_user_uuid>',
--   'email@example.com',
--   'Dr. Name',
--   'CLINICIAN',
--   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- );

CREATE OR REPLACE FUNCTION create_demo_profile(
  p_auth_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'CLINICIAN',
  p_org_id UUID DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p_is_expert_certified BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  INSERT INTO public.profiles (id, org_id, email, name, role, is_expert_certified, specialties)
  VALUES (p_auth_id, p_org_id, p_email, p_name, p_role, p_is_expert_certified, '[]'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_expert_certified = EXCLUDED.is_expert_certified
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. HELPER FUNCTION: Create complete demo dataset
-- ============================================
-- Use this after you have at least:
-- - 1 SYS_ADMIN profile
-- - 2 CLINICIAN profiles  
-- - 5 EXPERT_REVIEWER profiles with is_expert_certified = true
--
-- It will create sample cases with different statuses

CREATE OR REPLACE FUNCTION create_demo_cases()
RETURNS void AS $$
DECLARE
  v_clinician_id UUID;
  v_org_id UUID;
  v_case_draft_id UUID;
  v_case_review_id UUID;
  v_case_completed_id UUID;
  v_reviewer_ids UUID[];
  v_i INTEGER;
BEGIN
  -- Get a clinician to be the case submitter
  SELECT id, org_id INTO v_clinician_id, v_org_id
  FROM public.profiles
  WHERE role = 'CLINICIAN'
  LIMIT 1;
  
  IF v_clinician_id IS NULL THEN
    RAISE EXCEPTION 'No CLINICIAN profile found. Please create profiles first.';
  END IF;
  
  -- Get expert reviewers
  SELECT ARRAY_AGG(id) INTO v_reviewer_ids
  FROM (
    SELECT id FROM public.profiles
    WHERE role = 'EXPERT_REVIEWER'
      AND is_expert_certified = true
    LIMIT 5
  ) sub;
  
  IF v_reviewer_ids IS NULL OR array_length(v_reviewer_ids, 1) < 5 THEN
    RAISE EXCEPTION 'Need at least 5 certified EXPERT_REVIEWER profiles. Found: %', COALESCE(array_length(v_reviewer_ids, 1), 0);
  END IF;
  
  -- ============================================
  -- Create DRAFT case
  -- ============================================
  INSERT INTO public.cases (
    id, org_id, submitter_id, status, patient_pseudo_id, anatomy_region,
    diagnosis_codes, proposed_procedure_codes, symptom_profile, neuro_deficits,
    prior_surgery, comorbidities, conservative_care, free_text_summary
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_clinician_id,
    'DRAFT',
    'PATIENT-DRAFT-001',
    'LUMBAR',
    '["M54.5", "M51.16"]'::jsonb,
    '["22612", "22614"]'::jsonb,
    '{"summary": "Draft case - incomplete", "severity": 5}'::jsonb,
    '{"motor_weakness": false, "sensory_loss": false, "gait_instability": false, "bowel_bladder": false}'::jsonb,
    false,
    '{"diabetes": false, "smoker": false, "obesity": false}'::jsonb,
    '{"pt_tried": false, "meds": true, "injections": false, "duration": "2 months"}'::jsonb,
    'This is a draft case that has not been submitted yet.'
  ) RETURNING id INTO v_case_draft_id;
  
  RAISE NOTICE 'Created DRAFT case: %', v_case_draft_id;
  
  -- ============================================
  -- Create UNDER_REVIEW case with assigned reviewers
  -- ============================================
  INSERT INTO public.cases (
    id, org_id, submitter_id, status, patient_pseudo_id, anatomy_region,
    diagnosis_codes, proposed_procedure_codes, symptom_profile, neuro_deficits,
    prior_surgery, prior_surgery_details, comorbidities, conservative_care, 
    free_text_summary, submitted_at
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_clinician_id,
    'UNDER_REVIEW',
    'PATIENT-REVIEW-001',
    'LUMBAR',
    '["M54.5", "M51.16", "M48.06"]'::jsonb,
    '["22612", "22614", "22630"]'::jsonb,
    '{"summary": "58yo male with chronic low back pain and L4-L5 degenerative disc disease with stenosis", "duration": "18 months", "leg_vs_back": "leg_dominant", "severity": 7}'::jsonb,
    '{"motor_weakness": true, "sensory_loss": true, "gait_instability": false, "bowel_bladder": false}'::jsonb,
    false,
    NULL,
    '{"diabetes": true, "smoker": false, "obesity": true, "heart_disease": false, "osteoporosis": false}'::jsonb,
    '{"pt_tried": true, "meds": true, "injections": true, "duration": "6 months"}'::jsonb,
    'Patient has failed conservative management including 6 months of PT, NSAIDs, and two epidural steroid injections with minimal relief. MRI shows moderate central stenosis at L4-L5 with disc bulge and facet hypertrophy. Considering decompression with instrumented fusion.',
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_case_review_id;
  
  -- Assign 5 reviewers, 2 have submitted reviews
  FOR v_i IN 1..5 LOOP
    INSERT INTO public.reviews (
      case_id, reviewer_id, status, 
      surgery_indicated, fusion_indicated, preferred_approach,
      appropriateness_score, successful_outcome_likely, optimization_recommended,
      missing_data_flag, comments
    ) VALUES (
      v_case_review_id,
      v_reviewer_ids[v_i],
      CASE 
        WHEN v_i <= 2 THEN 'SUBMITTED'
        WHEN v_i = 3 THEN 'IN_PROGRESS'
        ELSE 'ASSIGNED'
      END,
      CASE WHEN v_i <= 2 THEN true ELSE NULL END,
      CASE WHEN v_i <= 2 THEN true ELSE NULL END,
      CASE WHEN v_i <= 2 THEN 'TLIF' ELSE NULL END,
      CASE WHEN v_i <= 2 THEN 7 + (v_i - 1) ELSE NULL END,
      CASE WHEN v_i <= 2 THEN true ELSE NULL END,
      CASE WHEN v_i <= 2 THEN false ELSE NULL END,
      CASE WHEN v_i <= 2 THEN false ELSE NULL END,
      CASE WHEN v_i = 1 THEN 'Appropriate surgical candidate after failed conservative management. L4-L5 TLIF reasonable approach.' 
           WHEN v_i = 2 THEN 'Agree with surgical intervention. Consider standalone ALIF as alternative given patient body habitus.' 
           ELSE NULL END
    );
    
    -- Create notification for assignment
    INSERT INTO public.notifications (user_id, type, payload, is_read)
    VALUES (
      v_reviewer_ids[v_i],
      'CASE_ASSIGNED',
      jsonb_build_object('caseId', v_case_review_id),
      CASE WHEN v_i <= 2 THEN true ELSE false END
    );
  END LOOP;
  
  RAISE NOTICE 'Created UNDER_REVIEW case: % with 5 reviewers assigned', v_case_review_id;
  
  -- ============================================
  -- Create COMPLETED case with results
  -- ============================================
  INSERT INTO public.cases (
    id, org_id, submitter_id, status, patient_pseudo_id, anatomy_region,
    diagnosis_codes, proposed_procedure_codes, symptom_profile, neuro_deficits,
    prior_surgery, comorbidities, conservative_care, 
    free_text_summary, submitted_at, completed_at
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    v_clinician_id,
    'COMPLETED',
    'PATIENT-COMPLETE-001',
    'CERVICAL',
    '["M50.12", "M47.812"]'::jsonb,
    '["22551", "22552"]'::jsonb,
    '{"summary": "45yo female with cervical radiculopathy C5-C6, C6-C7", "duration": "12 months", "leg_vs_back": "equal", "severity": 6}'::jsonb,
    '{"motor_weakness": true, "sensory_loss": true, "gait_instability": false, "bowel_bladder": false}'::jsonb,
    false,
    '{"diabetes": false, "smoker": false, "obesity": false, "heart_disease": false, "osteoporosis": false}'::jsonb,
    '{"pt_tried": true, "meds": true, "injections": true, "duration": "8 months"}'::jsonb,
    'Progressive cervical radiculopathy with C6 and C7 dermatomal symptoms bilaterally. MRI confirms C5-C6 and C6-C7 disc herniations with foraminal stenosis. EMG positive for C6-C7 radiculopathy. Recommending two-level ACDF.',
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '2 days'
  ) RETURNING id INTO v_case_completed_id;
  
  -- All 5 reviewers submitted reviews for completed case
  FOR v_i IN 1..5 LOOP
    INSERT INTO public.reviews (
      case_id, reviewer_id, status, 
      surgery_indicated, fusion_indicated, preferred_approach,
      appropriateness_score, successful_outcome_likely, optimization_recommended,
      missing_data_flag, comments
    ) VALUES (
      v_case_completed_id,
      v_reviewer_ids[v_i],
      'SUBMITTED',
      true,
      true,
      CASE 
        WHEN v_i IN (1, 2, 3) THEN 'PLF'
        ELSE 'DECOMPRESSION_ONLY'
      END,
      CASE v_i
        WHEN 1 THEN 7
        WHEN 2 THEN 8
        WHEN 3 THEN 7
        WHEN 4 THEN 6
        WHEN 5 THEN 8
      END,
      true,
      false,
      false,
      'Appropriate surgical candidate. Agreed with proposed ACDF procedure.'
    );
  END LOOP;
  
  -- Insert case result
  INSERT INTO public.case_results (
    case_id, final_class, mean_score, score_std_dev, num_reviews,
    percent_agreed_with_proposed, percent_recommended_alternative
  ) VALUES (
    v_case_completed_id,
    'APPROPRIATE',
    7.2,
    0.75,
    5,
    80.0,
    20.0
  );
  
  -- Notify clinician about result
  INSERT INTO public.notifications (user_id, type, payload, is_read)
  VALUES (v_clinician_id, 'CASE_RESULT_READY', jsonb_build_object('caseId', v_case_completed_id), false);
  
  RAISE NOTICE 'Created COMPLETED case: % with result', v_case_completed_id;
  
  RAISE NOTICE 'Demo data creation complete!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. QUICK SETUP INSTRUCTIONS
-- ============================================
/*
QUICK SETUP (for demo/testing):

STEP 1: Create auth users in Supabase Dashboard
------------------------------------------
Go to: Authentication > Users > Add User

Create these users (use "Auto Confirm User" option):
1. sysadmin@firstprinciples.io (System Admin)
2. admin1@alphaspine.io (Org Admin for Alpha)
3. admin2@betahealth.io (Org Admin for Beta)
4. clinician1@alphaspine.io (Clinician)
5. clinician2@betahealth.io (Clinician)
6-10. expert1@external.io through expert5@external.io (Expert Reviewers)

Password suggestion: "Demo2024!" for all test users

STEP 2: Create profiles using helper function
------------------------------------------
After creating each auth user, copy their UUID and run:

-- System Admin
SELECT create_demo_profile('<uuid>', 'sysadmin@firstprinciples.io', 'System Administrator', 'SYS_ADMIN', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

-- Org Admins
SELECT create_demo_profile('<uuid>', 'admin1@alphaspine.io', 'Dr. Alice Admin', 'ORG_ADMIN', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
SELECT create_demo_profile('<uuid>', 'admin2@betahealth.io', 'Dr. Bob Boss', 'ORG_ADMIN', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);

-- Clinicians
SELECT create_demo_profile('<uuid>', 'clinician1@alphaspine.io', 'Dr. Charles Clinician', 'CLINICIAN', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
SELECT create_demo_profile('<uuid>', 'clinician2@betahealth.io', 'Dr. Diana Doctor', 'CLINICIAN', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);

-- Expert Reviewers (from Beta org, for cross-org review)
SELECT create_demo_profile('<uuid>', 'expert1@external.io', 'Dr. Expert One', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert2@external.io', 'Dr. Expert Two', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert3@external.io', 'Dr. Expert Three', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert4@external.io', 'Dr. Expert Four', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert5@external.io', 'Dr. Expert Five', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

STEP 3: Create demo cases
------------------------------------------
Once you have profiles created (at least 1 clinician and 5 experts):

SELECT create_demo_cases();

This will create:
- 1 DRAFT case
- 1 UNDER_REVIEW case (with 5 assigned reviewers, 2 submitted)
- 1 COMPLETED case (with full results)

STEP 4: Test the application
------------------------------------------
Login with different user accounts to test:
- sysadmin@... → Full admin access, all orgs
- admin1@... → Org admin for Alpha Spine
- clinician1@... → Can submit cases
- expert1@... → Can review assigned cases
*/

