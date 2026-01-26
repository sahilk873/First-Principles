-- Phase 2: Data Aggregation + Scoring
-- case_aggregates: primary output of Phase 2 aggregation (gates, binary concordance, likert, secondary-review triggers)

CREATE TABLE IF NOT EXISTS public.case_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,

  -- Metadata
  n_assigned INTEGER NOT NULL DEFAULT 0,
  n_valid INTEGER NOT NULL DEFAULT 0,
  n_stopped_insufficient INTEGER NOT NULL DEFAULT 0,
  aggregation_status TEXT NOT NULL CHECK (aggregation_status IN (
    'AWAITING_REVIEWS',
    'NEEDS_MORE_INFO',
    'SCORED_PRIMARY',
    'SECONDARY_REVIEW_REQUIRED'
  )),

  -- Gate A: union of info_deficiencies from STOPPED_INSUFFICIENT_DATA reviews (for surgeon/admin)
  missing_items JSONB DEFAULT '[]'::jsonb,

  -- Binary results: per-question { agree_count, valid_count, agree_fraction, concordance_tier, flags }
  binary_results JSONB DEFAULT '{}'::jsonb,

  -- Likert (RAND) results
  appropriateness_mean NUMERIC,
  appropriateness_class TEXT CHECK (appropriateness_class IS NULL OR appropriateness_class IN ('INAPPROPRIATE', 'UNCERTAIN', 'APPROPRIATE')),
  necessity_mean NUMERIC,
  necessity_class TEXT CHECK (necessity_class IS NULL OR necessity_class IN ('INAPPROPRIATE', 'UNCERTAIN', 'APPROPRIATE')),

  -- Secondary review
  secondary_review_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  secondary_review_reasons JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_aggregates_case_id ON public.case_aggregates(case_id);
CREATE INDEX IF NOT EXISTS idx_case_aggregates_aggregation_status ON public.case_aggregates(aggregation_status);

ALTER TABLE public.case_aggregates ENABLE ROW LEVEL SECURITY;

-- Same visibility as case_results: submitter and org members
CREATE POLICY "Submitters can view case aggregates"
  ON public.case_aggregates FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM public.cases WHERE submitter_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view case aggregates"
  ON public.case_aggregates FOR SELECT
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.profiles p ON p.org_id = c.org_id
      WHERE p.id = auth.uid()
    )
  );

-- Service role / backend can upsert (RLS may be bypassed with service role; for app we use a policy that allows insert/update for users who can update cases – e.g. no direct user inserts; aggregation runs server-side). 
-- For RLS: we need backend to upsert. With createClient() as user, only SELECT would work. Aggregation runs in server actions with the logged-in user – but the user might be the reviewer who just submitted, not necessarily with case UPDATE. 
-- Easiest: allow INSERT/UPDATE for any profile that can view the case (submitter, org_admin, sys_admin). But aggregation is triggered by reviewer submit – reviewers can't update cases. So we need either:
-- 1) Run aggregation with a service-role client when we need to write. The codebase uses createClient() from server which uses the user's session.
-- 2) Add a policy: allow INSERT and UPDATE on case_aggregates if the case exists and the user is submitter, org_admin, or sys_admin. But the *reviewer* triggers aggregation – they don't have case update rights. So the server action runs as the reviewer; we'd need to allow reviewers to upsert case_aggregates for their assigned case. That's a bit broad (any reviewer could overwrite). Safer: only allow when it's an "aggregation" flow. RLS can't easily express "only when called from aggregation". 
-- 3) Use a PostgreSQL function with SECURITY DEFINER to perform the upsert, and call it from the app. More invasive.
-- 4) In Supabase, server-side code often uses the anon key with RLS. If we don't have service role in Next.js, we need a policy. Practical: allow UPDATE/INSERT on case_aggregates for cases where the user has a review (reviewer_id = auth.uid()) OR is submitter/org. That way, when a reviewer submits, the action runs as that reviewer and they have a review for the case – they can upsert the case_aggregates row. 
-- 
-- We'll add: Allow INSERT and UPDATE for users who can view the case (submitter, org members) OR who are reviewers on that case. (Reviewers can view the case via "Expert reviewers can view assigned cases".) For case_aggregates we need INSERT/UPDATE. 
-- INSERT/UPDATE: submitter, org_admin, sys_admin, or reviewer for that case.
CREATE POLICY "Submitters and org can manage case aggregates"
  ON public.case_aggregates FOR ALL
  USING (
    case_id IN (
      SELECT id FROM public.cases WHERE submitter_id = auth.uid()
      UNION
      SELECT c.id FROM public.cases c
      JOIN public.profiles p ON p.org_id = c.org_id
      WHERE p.id = auth.uid() AND p.role IN ('ORG_ADMIN', 'SYS_ADMIN')
    )
  )
  WITH CHECK (
    case_id IN (
      SELECT id FROM public.cases WHERE submitter_id = auth.uid()
      UNION
      SELECT c.id FROM public.cases c
      JOIN public.profiles p ON p.org_id = c.org_id
      WHERE p.id = auth.uid() AND p.role IN ('ORG_ADMIN', 'SYS_ADMIN')
    )
  );

CREATE POLICY "Reviewers can manage case aggregates for assigned case"
  ON public.case_aggregates FOR ALL
  USING (
    case_id IN (SELECT case_id FROM public.reviews WHERE reviewer_id = auth.uid())
  )
  WITH CHECK (
    case_id IN (SELECT case_id FROM public.reviews WHERE reviewer_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_case_aggregates_updated_at
  BEFORE UPDATE ON public.case_aggregates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.case_aggregates IS 'Phase 2: Aggregation outputs per case (gates, binary concordance, likert, secondary-review triggers)';
COMMENT ON COLUMN public.case_aggregates.aggregation_status IS 'AWAITING_REVIEWS | NEEDS_MORE_INFO | SCORED_PRIMARY | SECONDARY_REVIEW_REQUIRED';
COMMENT ON COLUMN public.case_aggregates.missing_items IS 'Union of info_deficiencies from STOPPED_INSUFFICIENT_DATA reviews';
COMMENT ON COLUMN public.case_aggregates.binary_results IS 'Per binary question: agree_count, valid_count, agree_fraction, concordance_tier, flags';
COMMENT ON COLUMN public.case_aggregates.secondary_review_reasons IS 'e.g. UNCERTAIN_APPROPRIATENESS_MEAN, INTERMEDIATE_CONCORDANCE_ON_<q>, INSUFFICIENT_REVIEWS, MISSING_KEY_FIELDS';
