-- Seed Data for First Principles
-- This creates sample organizations for testing
-- NOTE: Run this after creating a user through Supabase Auth

-- Insert sample organizations
INSERT INTO public.organizations (id, name, type, region) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Metro Health System', 'hospital', 'Northeast'),
  ('22222222-2222-2222-2222-222222222222', 'Spine Care Associates', 'private_practice', 'West Coast'),
  ('33333333-3333-3333-3333-333333333333', 'Regional Health Network', 'aco', 'Midwest')
ON CONFLICT (id) DO NOTHING;

-- To create a test user profile, run this AFTER creating a user in Supabase Auth:
-- 
-- INSERT INTO public.profiles (id, org_id, email, name, role, npi_number, specialties, is_expert_certified)
-- VALUES (
--   '<YOUR_AUTH_USER_ID>',  -- Get this from auth.users table after signup
--   '11111111-1111-1111-1111-111111111111',  -- Metro Health System
--   'your-email@example.com',
--   'Dr. Test User',
--   'CLINICIAN',  -- or 'EXPERT_REVIEWER', 'ORG_ADMIN', 'SYS_ADMIN'
--   '1234567890',
--   '["Orthopedic Surgery", "Spine Surgery"]'::jsonb,
--   false  -- or true for expert reviewers
-- );

-- Example: Create an expert reviewer profile
-- INSERT INTO public.profiles (id, org_id, email, name, role, npi_number, specialties, is_expert_certified)
-- VALUES (
--   '<YOUR_AUTH_USER_ID>',
--   '22222222-2222-2222-2222-222222222222',
--   'expert@example.com',
--   'Dr. Expert Reviewer',
--   'EXPERT_REVIEWER',
--   '0987654321',
--   '["Neurosurgery", "Spine Surgery", "Complex Spine Reconstruction"]'::jsonb,
--   true
-- );

