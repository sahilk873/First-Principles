-- Phase 1: Reviewer Workflow – data model for 5-step form with branching
-- Adds status STOPPED_INSUFFICIENT_DATA and all Step 1–5 columns

-- 1) Extend status enum to include STOPPED_INSUFFICIENT_DATA
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check
  CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'STOPPED_INSUFFICIENT_DATA'));

-- 2) Step 1: Data sufficiency
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS sufficient_info BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS info_deficiencies TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS more_than_necessary BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS info_burden_items TEXT;

-- 3) Step 2: Justification agreement
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_justification BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS justification_comment TEXT;

-- 4) Step 3: Care pathway (overall plan)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_overall_plan_acceptable BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS would_personally_prescribe BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS preferred_procedure_text TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_need_any_surgery_now BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS benefit_from_more_nonsurgical_first BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS proposed_nonsurgical_therapies_text TEXT;

-- 5) Step 3: Decompression sub-branch (when case has decompression + fusion)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_decompression_plan_acceptable BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_need_any_decompression_now BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS suggested_decompression_text TEXT;

-- 6) Step 3: Fusion sub-branch (when case has fusion)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_fusion_plan_acceptable BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agree_need_any_fusion_now BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS suggested_fusion_text TEXT;

-- 7) Step 4: necessity_score (appropriateness_score already exists, 1–9)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS necessity_score INTEGER
  CHECK (necessity_score IS NULL OR (necessity_score BETWEEN 1 AND 9));

-- 8) Step 5: Rationale and comments
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rationale_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rationale_other_text TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS final_comments TEXT;

COMMENT ON COLUMN public.reviews.sufficient_info IS 'Step 1: Is there sufficient information to complete the review?';
COMMENT ON COLUMN public.reviews.info_deficiencies IS 'Step 1: Required when sufficient_info=false';
COMMENT ON COLUMN public.reviews.more_than_necessary IS 'Step 1: Required when sufficient_info=true';
COMMENT ON COLUMN public.reviews.info_burden_items IS 'Step 1: Required when more_than_necessary=true';
COMMENT ON COLUMN public.reviews.agree_justification IS 'Step 2: Do you agree with the clinical justification?';
COMMENT ON COLUMN public.reviews.justification_comment IS 'Step 2: Required when agree_justification=false';
COMMENT ON COLUMN public.reviews.agree_overall_plan_acceptable IS 'Step 3: Is the overall surgical plan acceptable?';
COMMENT ON COLUMN public.reviews.necessity_score IS 'Step 4: 1–9, required only when appropriateness_score>=7';
COMMENT ON COLUMN public.reviews.rationale_factors IS 'Step 5: Array of enums: SYMPTOM_SEVERITY, SYMPTOM_DURATION, etc.';
COMMENT ON COLUMN public.reviews.final_comments IS 'Step 5: Optional, max ~500 words recommended';
