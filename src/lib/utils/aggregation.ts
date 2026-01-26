/**
 * Phase 2: Data Aggregation + Scoring
 * Gates, binary concordance, Likert (RAND) aggregation, secondary-review triggers.
 */

import type {
  AggregationStatus,
  BinaryResult,
  ConcordanceTier,
  LikertClass,
  SecondaryReviewReason,
} from '@/types/database';
import type { Review } from '@/types/database';

// ---------------------------------------------------------------------------
// Binary questions: all Phase 1 fields that are boolean (agree/disagree)
// Only aggregate questions that have at least one non-null among valid reviews.
// ---------------------------------------------------------------------------
export const BINARY_QUESTION_KEYS = [
  'agree_justification',
  'agree_overall_plan_acceptable',
  'would_personally_prescribe',
  'agree_need_any_surgery_now',
  'benefit_from_more_nonsurgical_first',
  'agree_decompression_plan_acceptable',
  'agree_need_any_decompression_now',
  'agree_fusion_plan_acceptable',
  'agree_need_any_fusion_now',
] as const;

export type BinaryQuestionKey = (typeof BINARY_QUESTION_KEYS)[number];

/** Key binary questions used for secondary-review trigger (intermediate = controversy/equipoise). Configurable. */
export const DEFAULT_KEY_BINARY_QUESTIONS: BinaryQuestionKey[] = [
  'agree_justification',
  'agree_overall_plan_acceptable',
  'agree_need_any_surgery_now',
];

/** Configurable: which key binary questions to use (can be overridden per case when decomp/fusion apply). */
export function getKeyBinaryQuestions(opts: {
  caseHasDecompressionPlusFusion: boolean;
  caseHasFusion: boolean;
}): BinaryQuestionKey[] {
  const keys: BinaryQuestionKey[] = [...DEFAULT_KEY_BINARY_QUESTIONS];
  if (opts.caseHasDecompressionPlusFusion) {
    keys.push('agree_decompression_plan_acceptable', 'agree_fusion_plan_acceptable');
  } else if (opts.caseHasFusion) {
    keys.push('agree_fusion_plan_acceptable');
  }
  return [...new Set(keys)];
}

// ---------------------------------------------------------------------------
// Concordance tier: upper third / middle third / lower third
// high if k >= ceil(2N/3), low if k <= floor(N/3), else intermediate
// ---------------------------------------------------------------------------
export function getConcordanceTier(agreeCount: number, validCount: number): ConcordanceTier {
  if (validCount <= 0) return 'INTERMEDIATE';
  const N = validCount;
  const k = agreeCount;
  if (k >= Math.ceil((2 * N) / 3)) return 'HIGH';
  if (k <= Math.floor(N / 3)) return 'LOW';
  return 'INTERMEDIATE';
}

// ---------------------------------------------------------------------------
// Likert (RAND) classification: 1–3 INAPPROPRIATE, 4–6 UNCERTAIN, 7–9 APPROPRIATE
// ---------------------------------------------------------------------------
export function getLikertClass(mean: number): LikertClass {
  if (mean >= 7) return 'APPROPRIATE';
  if (mean >= 4) return 'UNCERTAIN';
  return 'INAPPROPRIATE';
}

// ---------------------------------------------------------------------------
// Secondary review policy (configurable)
// Default: trigger if ANY of appropriateness_class UNCERTAIN, any key binary INTERMEDIATE,
// n_valid < 5, or excessive missingness for a key field (we keep it simple: no extra missingness rule by default).
// ---------------------------------------------------------------------------
export interface SecondaryReviewPolicy {
  triggerOnUncertainAppropriateness: boolean;
  triggerOnIntermediateConcordanceOnKey: boolean;
  triggerOnInsufficientReviews: boolean;
  triggerOnMissingKeyFields: boolean;
  keyBinaryQuestions: BinaryQuestionKey[];
}

export const DEFAULT_SECONDARY_REVIEW_POLICY: SecondaryReviewPolicy = {
  triggerOnUncertainAppropriateness: true,
  triggerOnIntermediateConcordanceOnKey: true,
  triggerOnInsufficientReviews: true,
  triggerOnMissingKeyFields: false, // optional; not strictly in spec
  keyBinaryQuestions: DEFAULT_KEY_BINARY_QUESTIONS,
};

// ---------------------------------------------------------------------------
// Parse info_deficiencies (TEXT) into array of unique non-empty items.
// Split by newline, semicolon, comma.
// ---------------------------------------------------------------------------
export function parseInfoDeficiencies(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const parts = raw.split(/[\n;,:]/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(parts)];
}

// ---------------------------------------------------------------------------
// Union of info_deficiencies from STOPPED_INSUFFICIENT_DATA reviews
// ---------------------------------------------------------------------------
export function unionMissingItems(
  reviews: Array<{ status: string; info_deficiencies: string | null }>
): string[] {
  const stopped = reviews.filter((r) => r.status === 'STOPPED_INSUFFICIENT_DATA');
  const sets = stopped.map((r) => parseInfoDeficiencies(r.info_deficiencies));
  const union = new Set<string>();
  for (const s of sets) for (const i of s) union.add(i);
  return [...union];
}

// ---------------------------------------------------------------------------
// Binary aggregation per question
// ---------------------------------------------------------------------------
type ReviewLike = Partial<Record<BinaryQuestionKey, boolean | null>>;

function getBinaryValue(r: ReviewLike, q: BinaryQuestionKey): boolean | null {
  const v = r[q];
  return typeof v === 'boolean' ? v : null;
}

export function computeBinaryResult(
  validReviews: ReviewLike[],
  question: BinaryQuestionKey
): BinaryResult | null {
  const values = validReviews.map((r) => getBinaryValue(r, question)).filter((v) => v !== null);
  const validCount = values.length;
  if (validCount === 0) return null;
  const agreeCount = values.filter((v) => v === true).length;
  const agreeFraction = agreeCount / validCount;
  const tier = getConcordanceTier(agreeCount, validCount);
  const flags: string[] = [];
  if (tier === 'INTERMEDIATE') flags.push('POTENTIAL_CONTROVERSY_OR_EQUIPOISE');
  return {
    agree_count: agreeCount,
    valid_count: validCount,
    agree_fraction: agreeFraction,
    concordance_tier: tier,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Likert: appropriateness and necessity
// ---------------------------------------------------------------------------
export function computeAppropriatenessMean(validReviews: Array<{ appropriateness_score: number | null }>): number | null {
  const vals = validReviews
    .map((r) => r.appropriateness_score)
    .filter((s): s is number => typeof s === 'number' && s >= 1 && s <= 9);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function computeNecessityMean(validReviews: Array<{ necessity_score: number | null }>): number | null {
  const vals = validReviews
    .map((r) => r.necessity_score)
    .filter((s): s is number => typeof s === 'number' && s >= 1 && s <= 9);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------------------------------------------------------------------------
// Map binary question key to SecondaryReviewReason for intermediate concordance
// ---------------------------------------------------------------------------
const INTERMEDIATE_REASON: Record<BinaryQuestionKey, SecondaryReviewReason> = {
  agree_justification: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_JUSTIFICATION',
  agree_overall_plan_acceptable: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_OVERALL_PLAN_ACCEPTABLE',
  would_personally_prescribe: 'INTERMEDIATE_CONCORDANCE_ON_WOULD_PERSONALLY_PRESCRIBE',
  agree_need_any_surgery_now: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_SURGERY_NOW',
  benefit_from_more_nonsurgical_first: 'INTERMEDIATE_CONCORDANCE_ON_BENEFIT_FROM_MORE_NONSURGICAL_FIRST',
  agree_decompression_plan_acceptable: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_DECOMPRESSION_PLAN_ACCEPTABLE',
  agree_need_any_decompression_now: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_DECOMPRESSION_NOW',
  agree_fusion_plan_acceptable: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_FUSION_PLAN_ACCEPTABLE',
  agree_need_any_fusion_now: 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_FUSION_NOW',
};

// ---------------------------------------------------------------------------
// Evaluate secondary review triggers; returns { triggered, reasons }
// ---------------------------------------------------------------------------
export function evaluateSecondaryReviewTriggers(opts: {
  nValid: number;
  appropriatenessClass: LikertClass | null;
  binaryResults: Record<string, BinaryResult>;
  keyBinaryQuestions: BinaryQuestionKey[];
  policy: SecondaryReviewPolicy;
}): { triggered: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { nValid, appropriatenessClass, binaryResults, keyBinaryQuestions, policy } = opts;

  if (policy.triggerOnInsufficientReviews && nValid < 5) {
    reasons.push('INSUFFICIENT_REVIEWS');
  }
  if (policy.triggerOnUncertainAppropriateness && appropriatenessClass === 'UNCERTAIN') {
    reasons.push('UNCERTAIN_APPROPRIATENESS_MEAN');
  }
  for (const q of keyBinaryQuestions) {
    const br = binaryResults[q];
    if (br && br.concordance_tier === 'INTERMEDIATE' && policy.triggerOnIntermediateConcordanceOnKey) {
      const r = INTERMEDIATE_REASON[q];
      if (r) reasons.push(r);
    }
  }
  if (policy.triggerOnMissingKeyFields) {
    // Optional: could push MISSING_KEY_FIELDS if e.g. >X% of valid reviews missing appropriateness_score
    // Not implemented by default.
  }

  return {
    triggered: reasons.length > 0,
    reasons: [...new Set(reasons)],
  };
}

// ---------------------------------------------------------------------------
// Input shape for computeCaseAggregate (reviews + case flags for key questions)
// ---------------------------------------------------------------------------
export type ReviewForAggregation = Pick<
  Review,
  | 'id'
  | 'status'
  | 'info_deficiencies'
  | 'agree_justification'
  | 'agree_overall_plan_acceptable'
  | 'would_personally_prescribe'
  | 'agree_need_any_surgery_now'
  | 'benefit_from_more_nonsurgical_first'
  | 'agree_decompression_plan_acceptable'
  | 'agree_need_any_decompression_now'
  | 'agree_fusion_plan_acceptable'
  | 'agree_need_any_fusion_now'
  | 'appropriateness_score'
  | 'necessity_score'
>;

export interface ComputeCaseAggregateInput {
  caseId: string;
  reviews: ReviewForAggregation[];
  caseHasDecompressionPlusFusion: boolean;
  caseHasFusion: boolean;
  policy?: Partial<SecondaryReviewPolicy>;
}

export interface ComputeCaseAggregateOutput {
  n_assigned: number;
  n_valid: number;
  n_stopped_insufficient: number;
  aggregation_status: AggregationStatus;
  missing_items: string[];
  binary_results: Record<string, BinaryResult>;
  appropriateness_mean: number | null;
  appropriateness_class: LikertClass | null;
  necessity_mean: number | null;
  necessity_class: LikertClass | null;
  secondary_review_triggered: boolean;
  secondary_review_reasons: string[];
}

/**
 * Phase 2: Compute case aggregate from reviews.
 * Implements Gate A (STOPPED_INSUFFICIENT_DATA → NEEDS_MORE_INFO),
 * Gate B (n_valid < 5 → AWAITING_REVIEWS), binary concordance, likert, secondary-review triggers.
 */
export function computeCaseAggregate(input: ComputeCaseAggregateInput): ComputeCaseAggregateOutput {
  const {
    caseId: _caseId,
    reviews,
    caseHasDecompressionPlusFusion,
    caseHasFusion,
    policy: policyOverride,
  } = input;

  const nAssigned = reviews.length;
  const valid = reviews.filter((r) => r.status === 'SUBMITTED');
  const nValid = valid.length;
  const stopped = reviews.filter((r) => r.status === 'STOPPED_INSUFFICIENT_DATA');
  const nStoppedInsufficient = stopped.length;

  const policy: SecondaryReviewPolicy = {
    ...DEFAULT_SECONDARY_REVIEW_POLICY,
    keyBinaryQuestions: getKeyBinaryQuestions({
      caseHasDecompressionPlusFusion,
      caseHasFusion,
    }),
    ...policyOverride,
  };

  // Gate A: any STOPPED_INSUFFICIENT_DATA → NEEDS_MORE_INFO, no scoring
  if (nStoppedInsufficient > 0) {
    const missingItems = unionMissingItems(reviews);
    return {
      n_assigned: nAssigned,
      n_valid: nValid,
      n_stopped_insufficient: nStoppedInsufficient,
      aggregation_status: 'NEEDS_MORE_INFO',
      missing_items: missingItems,
      binary_results: {},
      appropriateness_mean: null,
      appropriateness_class: null,
      necessity_mean: null,
      necessity_class: null,
      secondary_review_triggered: false,
      secondary_review_reasons: [],
    };
  }

  // Gate B: n_valid < 5 → AWAITING_REVIEWS, no scoring
  if (nValid < 5) {
    const triggerOnInsufficient = policy.triggerOnInsufficientReviews && nValid > 0;
    return {
      n_assigned: nAssigned,
      n_valid: nValid,
      n_stopped_insufficient: 0,
      aggregation_status: 'AWAITING_REVIEWS',
      missing_items: [],
      binary_results: {},
      appropriateness_mean: null,
      appropriateness_class: null,
      necessity_mean: null,
      necessity_class: null,
      secondary_review_triggered: triggerOnInsufficient,
      secondary_review_reasons: triggerOnInsufficient ? ['INSUFFICIENT_REVIEWS'] : [],
    };
  }

  // --- Aggregation: binary and likert ---
  const binaryResults: Record<string, BinaryResult> = {};
  for (const q of BINARY_QUESTION_KEYS) {
    const br = computeBinaryResult(valid, q);
    if (br) binaryResults[q] = br;
  }

  const appropriatenessMean = computeAppropriatenessMean(valid);
  const appropriatenessClass = appropriatenessMean != null ? getLikertClass(appropriatenessMean) : null;
  const necessityMean = computeNecessityMean(valid);
  const necessityClass = necessityMean != null ? getLikertClass(necessityMean) : null;

  const { triggered: secondaryTriggered, reasons: secondaryReasons } = evaluateSecondaryReviewTriggers({
    nValid,
    appropriatenessClass,
    binaryResults,
    keyBinaryQuestions: policy.keyBinaryQuestions,
    policy,
  });

  const aggregationStatus: AggregationStatus = secondaryTriggered
    ? 'SECONDARY_REVIEW_REQUIRED'
    : 'SCORED_PRIMARY';

  return {
    n_assigned: nAssigned,
    n_valid: nValid,
    n_stopped_insufficient: 0,
    aggregation_status: aggregationStatus,
    missing_items: [],
    binary_results: binaryResults,
    appropriateness_mean: appropriatenessMean,
    appropriateness_class: appropriatenessClass,
    necessity_mean: necessityMean,
    necessity_class: necessityClass,
    secondary_review_triggered: secondaryTriggered,
    secondary_review_reasons: secondaryReasons,
  };
}
