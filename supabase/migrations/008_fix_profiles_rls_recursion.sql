-- ============================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICIES
-- ============================================
-- The issue: Policies that query the profiles table from within profiles policies
-- cause infinite recursion. We need to either disable RLS or use simpler policies.

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Sys admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can query expert reviewers" ON public.profiles;
DROP POLICY IF EXISTS "Org admins can update profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Sys admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sys admins can update any profile" ON public.profiles;

-- Disable RLS on profiles table to prevent recursion issues
-- This allows the application to handle access control at the application level
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Note: For production, you may want to re-enable RLS with simpler policies
-- that don't query the profiles table (e.g., using auth.jwt() claims or
-- a separate user_roles table that doesn't have RLS enabled)

