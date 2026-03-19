import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { getProfileConfigFromEmail, getUserDisplayName } from './profile';
import { createServiceRoleClient } from '@/lib/supabase/admin';

/**
 * Attempts to create a profile for a user if it doesn't exist
 * Returns the profile if it exists or was successfully created, null otherwise
 */
export async function createProfileIfMissing(
  _supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  userMetadata?: Record<string, any>
): Promise<Profile | null> {
  // Use a service-role client for profile reads/writes.
  // Your current DB has RLS recursion on `profiles`, which can prevent anon-key reads/writes.
  // Service-role bypasses RLS, unblocking account creation.
  const adminSupabase = createServiceRoleClient();
  const admin = adminSupabase as any;

  const selectWithName =
    'id, org_id, email, name, role, npi_number, specialties, is_expert_certified, created_at, updated_at';
  const selectWithoutName =
    'id, org_id, email, role, npi_number, specialties, is_expert_certified, created_at, updated_at';

  const missingProfilesNameColumn = (err: any) =>
    typeof err?.message === 'string' &&
    (err.message.includes("Could not find the 'name' column of 'profiles'") ||
      err.message.includes('column profiles.name does not exist') ||
      err.message.includes('profiles.name does not exist') ||
      err.message.includes('profiles\".\"name\" does not exist'));

  // First, check if profile already exists
  const { data: existingProfile, error: fetchError } = await admin
    .from('profiles')
    .select(selectWithName)
    .eq('id', userId)
    .single();

  // If profile exists, return it (even if there was a minor error)
  if (existingProfile) {
    return existingProfile as Profile;
  }

  // If fetchError exists but no profile, log it for debugging
  if (fetchError) {
    // PGRST116 is "not found" which is expected if profile doesn't exist
    if (missingProfilesNameColumn(fetchError)) {
      const { data: fallbackProfile, error: fallbackFetchError } = await admin
        .from('profiles')
        .select(selectWithoutName)
        .eq('id', userId)
        .single();

      if (fallbackProfile) {
        // Ensure UI has a display name even if the column is missing.
        return {
          ...(fallbackProfile as any),
          name: getUserDisplayName(userEmail, userMetadata),
        } as Profile;
      }

      if (fallbackFetchError && fallbackFetchError.code !== 'PGRST116') {
        console.warn('Unexpected fallback error checking profile:', fallbackFetchError);
      }
    } else if (fetchError.code !== 'PGRST116') {
      console.warn('Unexpected error checking profile:', fetchError);
    }
  }

  // Profile doesn't exist, try to create it
  const profileConfig = getProfileConfigFromEmail(userEmail);
  
  if (!profileConfig) {
    console.warn('No profile config found for email:', userEmail);
    return null;
  }

  const displayName = getUserDisplayName(userEmail, userMetadata);

  // Create profile with ON CONFLICT handling (in case it was created between check and insert)
  const { data: createdProfile, error: createError } = await admin
    .from('profiles')
    .insert({
      id: userId,
      org_id: profileConfig.orgId,
      email: userEmail,
      name: displayName,
      role: profileConfig.role,
      is_expert_certified: profileConfig.isExpertCertified,
      specialties: []
    })
    .select(selectWithName)
    .single();

  // If insert failed, check if it's because profile already exists
  if (createError) {
    // Check if error is due to unique constraint (profile already exists)
    if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
      // Profile was created between our check and insert, fetch it
      const { data: existingProfileAfterError, error: refetchError } = await admin
        .from('profiles')
        .select(selectWithName)
        .eq('id', userId)
        .single();
      
      if (existingProfileAfterError && !refetchError) return existingProfileAfterError as Profile;

      // If refetch fails because `name` doesn't exist, retry without it.
      if (refetchError && missingProfilesNameColumn(refetchError)) {
        const { data: existingProfileAfterErrorNoName } = await admin
          .from('profiles')
          .select(selectWithoutName)
          .eq('id', userId)
          .single();

        if (existingProfileAfterErrorNoName) {
          return {
            ...(existingProfileAfterErrorNoName as any),
            name: displayName,
          } as Profile;
        }
      }
    }

    // If the DB doesn't yet have `profiles.name`, retry without it.
    if (missingProfilesNameColumn(createError)) {
      const { data: createdProfileNoName, error: createNoNameError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          org_id: profileConfig.orgId,
          email: userEmail,
          // name intentionally omitted; this handles environments where the column is missing.
          role: profileConfig.role,
          is_expert_certified: profileConfig.isExpertCertified,
          specialties: []
        })
        .select(selectWithoutName)
        .single();

      if (createNoNameError) {
        console.error('Failed to create profile (without name):', {
          code: createNoNameError.code,
          message: createNoNameError.message,
          details: createNoNameError.details,
          hint: createNoNameError.hint,
        });
        return null;
      }

      if (!createdProfileNoName) return null;

      return {
        ...(createdProfileNoName as any),
        name: displayName,
      } as Profile;
    }
    
    console.error('Failed to create profile:', {
      code: createError.code,
      message: createError.message,
      details: createError.details,
      hint: createError.hint
    });
    return null;
  }

  if (!createdProfile) {
    console.error('Profile creation returned no data');
    return null;
  }

  // Ensure `name` always exists for UI.
  return {
    ...(createdProfile as any),
    name: (createdProfile as any).name ?? displayName,
  } as Profile;
}

