/**
 * Phase 3: Secondary Review Process
 * Policies, state machine, and helper functions for secondary review workflow.
 */

import type {
  SecondaryReviewStatus,
  SecondaryParticipantRole,
  LikertClass,
} from '@/types/database';
import { getLikertClass } from './aggregation';

// ---------------------------------------------------------------------------
// Policy Configuration (configurable knobs)
// ---------------------------------------------------------------------------

export interface SecondaryReviewPolicy {
  peer_cohort_size_target: number; // e.g. 5-10
  forum_duration_hours: number; // e.g. 72
  min_reratings_total: number; // e.g. 5
  min_peer_reratings: number; // e.g. 3
  include_original_reviewers_required: boolean;
  allow_binary_rerating: boolean;
  scoring_statistic: 'mean' | 'median';
  moderator_required_to_close: boolean;
}

export const DEFAULT_SECONDARY_REVIEW_POLICY: SecondaryReviewPolicy = {
  peer_cohort_size_target: 7,
  forum_duration_hours: 72,
  min_reratings_total: 5,
  min_peer_reratings: 3,
  include_original_reviewers_required: true,
  allow_binary_rerating: false,
  scoring_statistic: 'mean',
  moderator_required_to_close: true,
};

// ---------------------------------------------------------------------------
// State Machine: Valid transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<SecondaryReviewStatus, SecondaryReviewStatus[]> = {
  CREATED: ['FORUM_OPEN', 'CANCELLED'],
  FORUM_OPEN: ['RERATING_OPEN', 'CANCELLED'],
  RERATING_OPEN: ['LOCKED_SCORING', 'CANCELLED'],
  LOCKED_SCORING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // terminal
  CANCELLED: [], // terminal
};

export function canTransition(
  from: SecondaryReviewStatus,
  to: SecondaryReviewStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Participant Selection Helpers
// ---------------------------------------------------------------------------

export interface ParticipantSelectionCriteria {
  excludeOrgId?: string; // exclude reviewers from same org as case
  requireExpertCertified?: boolean;
  specialtyMatch?: string[]; // optional specialty filters
  excludeUserIds?: string[]; // already selected
}

/**
 * Select peer surgeons for secondary review cohort.
 * Returns user IDs that meet criteria (specialty match, not same org, expert certified, etc.).
 */
export function selectPeerSurgeons(
  candidates: Array<{
    id: string;
    org_id: string;
    role: string;
    is_expert_certified: boolean;
    specialties: string[];
  }>,
  count: number,
  criteria: ParticipantSelectionCriteria
): string[] {
  const {
    excludeOrgId,
    requireExpertCertified = true,
    specialtyMatch,
    excludeUserIds = [],
  } = criteria;

  let filtered = candidates.filter((c) => {
    if (excludeUserIds.includes(c.id)) return false;
    if (excludeOrgId && c.org_id === excludeOrgId) return false;
    if (requireExpertCertified && !c.is_expert_certified) return false;
    if (c.role !== 'EXPERT_REVIEWER') return false;
    if (specialtyMatch && specialtyMatch.length > 0) {
      const hasMatch = c.specialties.some((s) => specialtyMatch.includes(s));
      if (!hasMatch) return false;
    }
    return true;
  });

  // Shuffle and take up to count
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c) => c.id);
}

// ---------------------------------------------------------------------------
// Re-rating Quorum Check
// ---------------------------------------------------------------------------

export interface ReratingQuorum {
  total: number;
  peers: number;
  original: number;
}

export function checkReratingQuorum(
  reratings: Array<{ user_id: string; role: SecondaryParticipantRole }>,
  participants: Array<{ user_id: string; role: SecondaryParticipantRole }>,
  policy: SecondaryReviewPolicy
): { met: boolean; quorum: ReratingQuorum; required: ReratingQuorum } {
  const originalReviewers = participants.filter((p) => p.role === 'ORIGINAL_REVIEWER');
  const peerSurgeons = participants.filter((p) => p.role === 'PEER_SURGEON');

  const reratingUserIds = new Set(reratings.map((r) => r.user_id));
  const reratingByRole = {
    original: reratings.filter((r) =>
      originalReviewers.some((p) => p.user_id === r.user_id)
    ).length,
    peers: reratings.filter((r) =>
      peerSurgeons.some((p) => p.user_id === r.user_id)
    ).length,
    total: reratings.length,
  };

  const required: ReratingQuorum = {
    total: policy.min_reratings_total,
    peers: policy.min_peer_reratings,
    original: policy.include_original_reviewers_required ? originalReviewers.length : 0,
  };

  const met =
    reratingByRole.total >= required.total &&
    reratingByRole.peers >= required.peers &&
    (!policy.include_original_reviewers_required || reratingByRole.original >= required.original);

  return {
    met,
    quorum: reratingByRole,
    required,
  };
}

// ---------------------------------------------------------------------------
// Adjusted Score Computation
// ---------------------------------------------------------------------------

export interface AdjustedScores {
  appropriateness_mean: number;
  appropriateness_class: LikertClass;
  necessity_mean: number | null;
  necessity_class: LikertClass | null;
}

export function computeAdjustedScores(
  reratings: Array<{
    appropriateness_score_final: number;
    necessity_score_final: number | null;
  }>,
  policy: SecondaryReviewPolicy
): AdjustedScores {
  const appScores = reratings.map((r) => r.appropriateness_score_final);
  const appMean =
    policy.scoring_statistic === 'median'
      ? computeMedian(appScores)
      : appScores.reduce((a, b) => a + b, 0) / appScores.length;

  const necScores = reratings
    .map((r) => r.necessity_score_final)
    .filter((s): s is number => s != null);
  const necMean =
    necScores.length > 0
      ? policy.scoring_statistic === 'median'
        ? computeMedian(necScores)
        : necScores.reduce((a, b) => a + b, 0) / necScores.length
      : null;

  return {
    appropriateness_mean: appMean,
    appropriateness_class: getLikertClass(appMean),
    necessity_mean: necMean,
    necessity_class: necMean != null ? getLikertClass(necMean) : null,
  };
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ---------------------------------------------------------------------------
// Summary Assessment Generation
// ---------------------------------------------------------------------------

export interface SummaryAssessmentInput {
  adjustedScores: AdjustedScores;
  primaryScores: {
    appropriateness_mean: number | null;
    appropriateness_class: LikertClass | null;
    necessity_mean: number | null;
  };
  controversialItems: Array<{ question: string; tier: string }>;
  reratingsCount: number;
  participantsCount: number;
}

/**
 * Generate structured summary assessment (auto-draft, editable by moderator).
 */
export function generateSummaryAssessment(input: SummaryAssessmentInput): string {
  const {
    adjustedScores,
    primaryScores,
    controversialItems,
    reratingsCount,
    participantsCount,
  } = input;

  const sections: string[] = [];

  // Final adjusted scores
  sections.push('## Final Adjusted Scores');
  sections.push(
    `**Appropriateness:** ${adjustedScores.appropriateness_mean.toFixed(1)}/9 (${adjustedScores.appropriateness_class})`
  );
  if (adjustedScores.necessity_mean != null) {
    sections.push(
      `**Necessity:** ${adjustedScores.necessity_mean.toFixed(1)}/9 (${adjustedScores.necessity_class})`
    );
  }
  sections.push(`Based on ${reratingsCount} re-ratings from ${participantsCount} participants.`);

  // What drove disagreement
  if (controversialItems.length > 0) {
    sections.push('\n## Key Areas of Disagreement');
    for (const item of controversialItems) {
      sections.push(`- ${item.question}: ${item.tier} concordance`);
    }
  }

  // What changed from primary
  if (primaryScores.appropriateness_mean != null) {
    const shift = adjustedScores.appropriateness_mean - primaryScores.appropriateness_mean;
    sections.push('\n## Change from Primary Review');
    sections.push(
      `Primary appropriateness: ${primaryScores.appropriateness_mean.toFixed(1)}/9 (${primaryScores.appropriateness_class})`
    );
    sections.push(
      `Adjusted appropriateness: ${adjustedScores.appropriateness_mean.toFixed(1)}/9 (${adjustedScores.appropriateness_class})`
    );
    if (Math.abs(shift) > 0.5) {
      sections.push(
        `**Shift:** ${shift > 0 ? '+' : ''}${shift.toFixed(1)} points (${shift > 0 ? 'more' : 'less'} appropriate)`
      );
    }
  }

  // Suggested next steps (if not appropriate/uncertain)
  if (
    adjustedScores.appropriateness_class === 'INAPPROPRIATE' ||
    adjustedScores.appropriateness_class === 'UNCERTAIN'
  ) {
    sections.push('\n## Recommended Next Steps');
    sections.push(
      'Consider: additional non-surgical management, alternative surgical approaches, or further diagnostic workup.'
    );
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Changed from Primary Detection
// ---------------------------------------------------------------------------

export function detectChangedFromPrimary(
  primaryReview: {
    appropriateness_score: number | null;
    necessity_score: number | null;
  } | null,
  rerating: {
    appropriateness_score_final: number;
    necessity_score_final: number | null;
  }
): boolean {
  if (!primaryReview) return false;
  if (primaryReview.appropriateness_score !== rerating.appropriateness_score_final) return true;
  if (
    primaryReview.necessity_score != null &&
    rerating.necessity_score_final != null &&
    primaryReview.necessity_score !== rerating.necessity_score_final
  ) {
    return true;
  }
  return false;
}
