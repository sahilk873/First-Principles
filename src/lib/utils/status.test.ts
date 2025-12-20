import { describe, expect, it } from 'vitest';
import {
  getStatusBadgeVariant,
  getResultBadgeVariant,
  formatStatus,
  formatFinalClass,
} from './status';

describe('status utilities', () => {
  it('maps each known case status to a badge variant', () => {
    expect(getStatusBadgeVariant('DRAFT')).toBe('default');
    expect(getStatusBadgeVariant('SUBMITTED')).toBe('info');
    expect(getStatusBadgeVariant('UNDER_REVIEW')).toBe('warning');
    expect(getStatusBadgeVariant('COMPLETED')).toBe('success');
    expect(getStatusBadgeVariant('FAILED')).toBe('error');
    expect(getStatusBadgeVariant('UNKNOWN')).toBe('default');
  });

  it('maps case result classifications', () => {
    expect(getResultBadgeVariant('APPROPRIATE')).toBe('success');
    expect(getResultBadgeVariant('UNCERTAIN')).toBe('warning');
    expect(getResultBadgeVariant('INAPPROPRIATE')).toBe('error');
    expect(getResultBadgeVariant('')).toBe('default');
  });

  it('formats status strings safely', () => {
    expect(formatStatus('UNDER_REVIEW')).toBe('Under Review');
    expect(formatStatus('single')).toBe('Single');
  });

  it('formats final class strings defensively', () => {
    expect(formatFinalClass('APPROPRIATE')).toBe('Appropriate');
    expect(formatFinalClass('uncertain')).toBe('Uncertain');
    expect(formatFinalClass('')).toBe('');
  });
});
