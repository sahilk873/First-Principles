import { describe, expect, it } from 'vitest';
import { getProfileConfigFromEmail, getUserDisplayName } from './profile';

describe('profile utilities', () => {
  it('selects correct config for known roles', () => {
    expect(getProfileConfigFromEmail('sysadmin@demo.io')).toMatchObject({ role: 'SYS_ADMIN' });
    expect(getProfileConfigFromEmail('clinician2@alphaspine.io')).toMatchObject({
      role: 'CLINICIAN',
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
    expect(getProfileConfigFromEmail('clinician@betahealth.io')).toMatchObject({
      role: 'CLINICIAN',
      orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
    expect(getProfileConfigFromEmail('expert15@demo.io')).toMatchObject({
      role: 'EXPERT_REVIEWER',
      isExpertCertified: true,
    });
  });

  it('falls back to clinician default for unknown emails', () => {
    expect(getProfileConfigFromEmail('test@example.com')).toMatchObject({
      role: 'CLINICIAN',
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
  });

  it('generates display names from email or metadata', () => {
    expect(getUserDisplayName('jane.doe@example.com')).toBe('Jane Doe');
    expect(getUserDisplayName('solo@example.com')).toBe('Solo');
    expect(getUserDisplayName('ignored@example.com', { name: 'Preferred Name' })).toBe('Preferred Name');
  });
});
