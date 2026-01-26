/**
 * Helpers for Phase 1 reviewer workflow.
 * Derives case flags from clinical_data / proposed_procedure_codes.
 */

import type { RationaleFactor } from '@/types/database';

/** All rationale factor options for Step 5 multi-select */
export const RATIONALE_FACTOR_OPTIONS: { value: RationaleFactor; label: string }[] = [
  { value: 'SYMPTOM_SEVERITY', label: 'Symptom severity' },
  { value: 'SYMPTOM_DURATION', label: 'Symptom duration' },
  { value: 'FUNCTIONAL_DISABILITY', label: 'Functional disability' },
  { value: 'STRUCTURAL_ABNORMALITY_PRESENT', label: 'Structural abnormality present' },
  { value: 'EXAM_FINDINGS', label: 'Exam findings' },
  { value: 'SYMPTOM_STRUCTURE_CORRELATION', label: 'Symptom-structure correlation' },
  { value: 'FAILED_CONSERVATIVE_THERAPY', label: 'Failed conservative therapy' },
  { value: 'PSYCHOSOCIAL_FACTORS', label: 'Psychosocial factors' },
  { value: 'COMORBIDITIES', label: 'Comorbidities' },
  { value: 'OTHER', label: 'Other' },
];

type SegmentLike = {
  direct_decompression?: boolean;
  indirect_decompression?: boolean;
  fusion?: boolean;
};

type ClinicalDataLike = {
  section10?: {
    segments?: SegmentLike[];
  };
} | null | undefined;

/** Minimal case-like shape for deriving decompression/fusion flags. */
export type CaseLike = {
  clinical_data?: unknown;
  proposed_procedure_codes?: string[];
};

// Common CPT/ HCPCS patterns for decompression and fusion (heuristic fallback)
const DECOMPRESSION_CODE_PATTERN = /63047|63048|63042|63044|63045|63046|0274T|62287|62380/i;
const FUSION_CODE_PATTERN = /22612|22614|22558|22585|22842|22843|22844|22845|22630|22632|22633|22634|20930|20931|20936|20937|21110|21299|22551|22552|22840|22841/i;

/**
 * True when the case includes both decompression and fusion (from section10 or procedure codes).
 */
export function getCaseHasDecompressionPlusFusion(c: CaseLike): boolean {
  const cd = c?.clinical_data as ClinicalDataLike | undefined | null;
  if (cd?.section10?.segments?.length) {
    const hasDecomp = cd.section10!.segments!.some(
      (s) => s.direct_decompression || s.indirect_decompression
    );
    const hasFusion = cd.section10!.segments!.some((s) => s.fusion);
    return !!hasDecomp && !!hasFusion;
  }
  const codes = c?.proposed_procedure_codes || [];
  const hasDecomp = codes.some((x) => DECOMPRESSION_CODE_PATTERN.test(String(x)));

  const hasFusion = codes.some((x) => FUSION_CODE_PATTERN.test(String(x)));
  return hasDecomp && hasFusion;
}

/**
 * True when the case includes fusion (with or without decompression).
 */
export function getCaseHasFusion(c: CaseLike): boolean {
  const cd = c?.clinical_data as ClinicalDataLike | undefined | null;
  if (cd?.section10?.segments?.length) {
    if (cd.section10!.segments!.some((s) => s.fusion)) return true;
  }
  const codes = c?.proposed_procedure_codes || [];
  return codes.some((x) => FUSION_CODE_PATTERN.test(String(x)));
}

/** LIKERT_MIN = 1, LIKERT_MAX = 9 */
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 9;

/** Appropriateness: 1–3 INAPPROPRIATE, 4–6 UNCERTAIN, 7–9 APPROPRIATE */
export function getAppropriatenessBucket(score: number): 'INAPPROPRIATE' | 'UNCERTAIN' | 'APPROPRIATE' {
  if (score >= 7) return 'APPROPRIATE';
  if (score >= 4) return 'UNCERTAIN';
  return 'INAPPROPRIATE';
}
