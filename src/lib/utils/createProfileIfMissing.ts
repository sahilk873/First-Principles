import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { getProfileConfigFromEmail, getUserDisplayName } from './profile';

/**
 * Attempts to create a profile for a user if it doesn't exist
 * Returns the profile if it exists or was successfully created, null otherwise
 */
export async function createProfileIfMissing(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  userMetadata?: Record<string, any>
): Promise<Profile | null> {
  // First, check if profile already exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // If profile exists, return it (even if there was a minor error)
  if (existingProfile) {
    return existingProfile as Profile;
  }

  // If fetchError exists but no profile, log it for debugging
  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected if profile doesn't exist
    console.warn('Unexpected error checking profile:', fetchError);
  }

  // Profile doesn't exist, try to create it
  const profileConfig = getProfileConfigFromEmail(userEmail);
  
  if (!profileConfig) {
    console.warn('No profile config found for email:', userEmail);
    return null;
  }

  const displayName = getUserDisplayName(userEmail, userMetadata);

  // Create profile with ON CONFLICT handling (in case it was created between check and insert)
  const { data: createdProfile, error: createError } = await supabase
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
    .select()
    .single();

  // If insert failed, check if it's because profile already exists
  if (createError) {
    // Check if error is due to unique constraint (profile already exists)
    if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
      // Profile was created between our check and insert, fetch it
      const { data: existingProfileAfterError, error: refetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (existingProfileAfterError && !refetchError) {
        return existingProfileAfterError as Profile;
      }
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

  return createdProfile as Profile;
}

