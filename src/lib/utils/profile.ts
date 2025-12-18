/**
 * Utility functions for managing user profiles
 */

type UserRole = 'CLINICIAN' | 'EXPERT_REVIEWER' | 'ORG_ADMIN' | 'SYS_ADMIN';

interface ProfileConfig {
  role: UserRole;
  orgId: string;
  isExpertCertified: boolean;
}

/**
 * Determines profile configuration based on email address
 * This matches the email patterns used in the create-demo-users.js script
 */
export function getProfileConfigFromEmail(email: string): ProfileConfig | null {
  const lowerEmail = email.toLowerCase();
  
  // Alpha Spine organization ID
  const ALPHA_SPINE_ORG = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  // Beta Health organization ID
  const BETA_HEALTH_ORG = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  
  // System Admin
  if (lowerEmail === 'sysadmin@demo.io') {
    return {
      role: 'SYS_ADMIN',
      orgId: ALPHA_SPINE_ORG,
      isExpertCertified: false,
    };
  }
  
  // Org Admins
  if (lowerEmail === 'admin@alphaspine.io') {
    return {
      role: 'ORG_ADMIN',
      orgId: ALPHA_SPINE_ORG,
      isExpertCertified: false,
    };
  }
  
  if (lowerEmail === 'admin@betahealth.io') {
    return {
      role: 'ORG_ADMIN',
      orgId: BETA_HEALTH_ORG,
      isExpertCertified: false,
    };
  }
  
  // Expert Reviewers (expert1@demo.io through expert15@demo.io)
  if (lowerEmail.match(/^expert\d+@demo\.io$/)) {
    return {
      role: 'EXPERT_REVIEWER',
      orgId: BETA_HEALTH_ORG,
      isExpertCertified: true,
    };
  }
  
  // Clinicians at Alpha Spine (clinician@alphaspine.io, clinician2@alphaspine.io, clinician3@alphaspine.io)
  if (lowerEmail.match(/^clinician\d*@alphaspine\.io$/)) {
    return {
      role: 'CLINICIAN',
      orgId: ALPHA_SPINE_ORG,
      isExpertCertified: false,
    };
  }
  
  // Clinicians at Beta Health (clinician@betahealth.io, clinician2@betahealth.io)
  if (lowerEmail.match(/^clinician\d*@betahealth\.io$/)) {
    return {
      role: 'CLINICIAN',
      orgId: BETA_HEALTH_ORG,
      isExpertCertified: false,
    };
  }
  
  // Default: Clinician at Alpha Spine (fallback for any other email)
  return {
    role: 'CLINICIAN',
    orgId: ALPHA_SPINE_ORG,
    isExpertCertified: false,
  };
}

/**
 * Gets a display name from email or user metadata
 */
export function getUserDisplayName(email: string, userMetadata?: Record<string, any>): string {
  if (userMetadata?.name) {
    return userMetadata.name;
  }
  
  // Extract name from email if possible
  const emailParts = email.split('@')[0];
  const parts = emailParts.split(/[._-]/);
  if (parts.length > 1) {
    return parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
}

