'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { UserRole, OrganizationType, Profile } from '@/types/database';
import { randomBytes } from 'crypto';

// Helper types for partial profile data
type ProfileRole = Pick<Profile, 'id' | 'role' | 'org_id'>;
type ProfileCert = Pick<Profile, 'id' | 'is_expert_certified' | 'org_id'>;

const DEFAULT_PROVISIONING_DOMAIN = process.env.USER_PROVISIONING_EMAIL_DOMAIN || 'firstprinciples.local';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const slugifyName = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug || 'user';
};

const generateEmail = (name: string) => {
  const slug = slugifyName(name);
  const suffix = randomBytes(2).toString('hex');
  return `${slug}.${suffix}@${DEFAULT_PROVISIONING_DOMAIN}`;
};

// ============================================
// USER MANAGEMENT ACTIONS
// ============================================

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current user's profile
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single();

  const currentProfile = currentProfileData as ProfileRole | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check permissions
  if (currentProfile.role !== 'ORG_ADMIN' && currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Not authorized to update user roles' };
  }

  // Get target user's profile
  const { data: targetProfileData } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', userId)
    .single();

  const targetProfile = targetProfileData as ProfileRole | null;

  if (!targetProfile) {
    return { success: false, error: 'Target user not found' };
  }

  // ORG_ADMIN restrictions
  if (currentProfile.role === 'ORG_ADMIN') {
    // Can only modify users in same org
    if (targetProfile.org_id !== currentProfile.org_id) {
      return { success: false, error: 'Cannot modify users outside your organization' };
    }
    // Cannot set SYS_ADMIN role
    if (newRole === 'SYS_ADMIN') {
      return { success: false, error: 'Cannot assign system admin role' };
    }
    // Cannot modify SYS_ADMIN users
    if (targetProfile.role === 'SYS_ADMIN') {
      return { success: false, error: 'Cannot modify system admin users' };
    }
  }

  // Update the role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole } as never)
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user role:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function toggleExpertCertification(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current user's profile
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single();

  const currentProfile = currentProfileData as ProfileRole | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check permissions
  if (currentProfile.role !== 'ORG_ADMIN' && currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Not authorized to update certification status' };
  }

  // Get target user's current profile
  const { data: targetProfileData } = await supabase
    .from('profiles')
    .select('id, is_expert_certified, org_id')
    .eq('id', userId)
    .single();

  const targetProfile = targetProfileData as ProfileCert | null;

  if (!targetProfile) {
    return { success: false, error: 'Target user not found' };
  }

  // ORG_ADMIN restrictions
  if (currentProfile.role === 'ORG_ADMIN' && targetProfile.org_id !== currentProfile.org_id) {
    return { success: false, error: 'Cannot modify users outside your organization' };
  }

  // Toggle the certification status
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_expert_certified: !targetProfile.is_expert_certified } as never)
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating certification status:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateUserOrganization(
  userId: string,
  newOrgId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current user's profile
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  const currentProfile = currentProfileData as Pick<Profile, 'id' | 'role'> | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  // Only SYS_ADMIN can change org assignments
  if (currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Only system admins can reassign users to different organizations' };
  }

  // Verify target organization exists
  const { data: targetOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', newOrgId)
    .single();

  if (!targetOrg) {
    return { success: false, error: 'Target organization not found' };
  }

  // Update the organization
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ org_id: newOrgId } as never)
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user organization:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

// Note: This creates a profile record only. The actual Supabase Auth user
// must be created separately (e.g., via invite link or dashboard).
// In production, you would use Supabase's invite API or admin auth.
export async function quickCreateUser(
  name: string,
  role: UserRole,
  email?: string
): Promise<{ success: boolean; email?: string; inviteSent?: boolean; error?: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Name is required' };
  }

  const providedEmail = email?.trim();
  if (providedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: currentProfileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error loading current profile:', profileError);
    return { success: false, error: 'Failed to load current profile' };
  }

  const currentProfile = currentProfileData as ProfileRole | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  if (!currentProfile.org_id) {
    return { success: false, error: 'Your profile is missing an organization assignment' };
  }

  if (currentProfile.role !== 'ORG_ADMIN' && currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Not authorized to create users' };
  }

  if (currentProfile.role === 'ORG_ADMIN' && role === 'SYS_ADMIN') {
    return { success: false, error: 'Cannot create system admin users' };
  }

  const adminClient = createServiceRoleClient();
  const targetEmail = providedEmail || generateEmail(trimmedName);

  const { data: inviteData, error: adminError } = await adminClient.auth.admin.inviteUserByEmail(targetEmail, {
    data: { name: trimmedName },
    redirectTo: `${SITE_URL}/auth/complete-invite`,
  });

  if (adminError || !inviteData?.user?.id) {
    console.error('Error inviting auth user:', adminError);
    return { success: false, error: adminError?.message || 'Failed to invite user' };
  }

  const newUserId = inviteData.user.id;

  const { error: profileInsertError } = await adminClient.from('profiles').insert({
    id: newUserId,
    org_id: currentProfile.org_id,
    email: targetEmail,
    name: trimmedName,
    role,
    is_expert_certified: role === 'EXPERT_REVIEWER' ? false : null,
  } as never);

  if (profileInsertError) {
    console.error('Error inserting profile:', profileInsertError);
    await adminClient.auth.admin.deleteUser(newUserId);
    return { success: false, error: 'Failed to persist user profile' };
  }

  await adminClient.from('user_provisioning_events').insert({
    created_by: currentProfile.id,
    new_user_id: newUserId,
    name: trimmedName,
    role,
    generated_email: targetEmail,
    password_hint: 'Invite',
  } as never);

  revalidatePath('/admin/users');

  return {
    success: true,
    email: targetEmail,
    inviteSent: true,
  };
}

// ============================================
// ORGANIZATION MANAGEMENT ACTIONS
// ============================================

export async function createOrganization(
  name: string,
  type: OrganizationType,
  region: string
): Promise<{ success: boolean; orgId?: string; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current user's profile
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  const currentProfile = currentProfileData as Pick<Profile, 'id' | 'role'> | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  // Only SYS_ADMIN can create organizations
  if (currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Only system admins can create organizations' };
  }

  // Insert the organization
  const { data: newOrgData, error: insertError } = await supabase
    .from('organizations')
    .insert({
      name,
      type,
      region: region || null,
    } as never)
    .select('id')
    .single();

  const newOrg = newOrgData as { id: string } | null;

  if (insertError) {
    console.error('Error creating organization:', insertError);
    return { success: false, error: insertError.message };
  }

  revalidatePath('/admin/orgs');
  revalidatePath('/admin/users');
  return { success: true, orgId: newOrg?.id };
}

export async function updateOrganization(
  orgId: string,
  name: string,
  type: OrganizationType,
  region: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current user's profile
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  const currentProfile = currentProfileData as Pick<Profile, 'id' | 'role'> | null;

  if (!currentProfile) {
    return { success: false, error: 'Profile not found' };
  }

  // Only SYS_ADMIN can update organizations
  if (currentProfile.role !== 'SYS_ADMIN') {
    return { success: false, error: 'Only system admins can update organizations' };
  }

  // Update the organization
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      name,
      type,
      region: region || null,
    } as never)
    .eq('id', orgId);

  if (updateError) {
    console.error('Error updating organization:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/orgs');
  revalidatePath('/admin/users');
  return { success: true };
}

// ============================================
// NOTIFICATION ACTIONS
// ============================================

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update the notification
  const { error: updateError } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    } as never)
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error marking notification as read:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/notifications');
  return { success: true };
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update all unread notifications for this user
  const { error: updateError } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    } as never)
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (updateError) {
    console.error('Error marking all notifications as read:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/notifications');
  return { success: true };
}
