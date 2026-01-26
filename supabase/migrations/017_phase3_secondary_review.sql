-- Phase 3: Secondary Review Process
-- Interactive forum + re-rating workflow for cases with intermediate/indeterminate scores

-- 1) Extend case status to include SCORED_FINAL (after Phase 3 completes)
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE public.cases ADD CONSTRAINT cases_status_check
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'FAILED', 'SCORED_FINAL'));

-- 2) SecondaryReview: main session record
CREATE TABLE IF NOT EXISTS public.secondary_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'CREATED',
    'FORUM_OPEN',
    'RERATING_OPEN',
    'LOCKED_SCORING',
    'COMPLETED',
    'CANCELLED'
  )),
  trigger_reasons JSONB DEFAULT '[]'::jsonb,
  policy_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_secondary_reviews_case_id ON public.secondary_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_secondary_reviews_status ON public.secondary_reviews(status);

-- 3) SecondaryParticipant: who's involved (original reviewers + peer surgeons)
CREATE TABLE IF NOT EXISTS public.secondary_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_review_id UUID NOT NULL REFERENCES public.secondary_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ORIGINAL_REVIEWER', 'PEER_SURGEON', 'MODERATOR', 'ADMIN')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(secondary_review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_secondary_participants_review_id ON public.secondary_participants(secondary_review_id);
CREATE INDEX IF NOT EXISTS idx_secondary_participants_user_id ON public.secondary_participants(user_id);

-- 4) ForumThread: discussion threads (typically one main thread per secondary review)
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_review_id UUID NOT NULL REFERENCES public.secondary_reviews(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pinned_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_review_id ON public.forum_threads(secondary_review_id);

-- 5) ForumPost: individual posts/comments
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('COMMENT', 'QUESTION', 'ANSWER', 'MOD_NOTE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id ON public.forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);

-- 6) SecondaryReRating: re-ratings from participants
CREATE TABLE IF NOT EXISTS public.secondary_reratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_review_id UUID NOT NULL REFERENCES public.secondary_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  appropriateness_score_final INTEGER NOT NULL CHECK (appropriateness_score_final BETWEEN 1 AND 9),
  necessity_score_final INTEGER CHECK (necessity_score_final IS NULL OR (necessity_score_final BETWEEN 1 AND 9)),
  binary_votes_final JSONB DEFAULT '{}'::jsonb,
  rationale_final TEXT NOT NULL,
  changed_from_primary BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(secondary_review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_secondary_reratings_review_id ON public.secondary_reratings(secondary_review_id);
CREATE INDEX IF NOT EXISTS idx_secondary_reratings_user_id ON public.secondary_reratings(user_id);

-- 7) SecondaryOutcome: final results reported back to surgeon
CREATE TABLE IF NOT EXISTS public.secondary_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_review_id UUID NOT NULL UNIQUE REFERENCES public.secondary_reviews(id) ON DELETE CASCADE,
  adjusted_appropriateness_mean NUMERIC NOT NULL,
  adjusted_appropriateness_class TEXT NOT NULL CHECK (adjusted_appropriateness_class IN ('INAPPROPRIATE', 'UNCERTAIN', 'APPROPRIATE')),
  adjusted_necessity_mean NUMERIC,
  adjusted_necessity_class TEXT CHECK (adjusted_necessity_class IS NULL OR adjusted_necessity_class IN ('INAPPROPRIATE', 'UNCERTAIN', 'APPROPRIATE')),
  summary_assessment TEXT NOT NULL,
  participants_count INTEGER NOT NULL,
  reratings_count INTEGER NOT NULL,
  reported_to_surgeon_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secondary_outcomes_review_id ON public.secondary_outcomes(secondary_review_id);

-- Triggers for updated_at
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.secondary_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_reratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_outcomes ENABLE ROW LEVEL SECURITY;

-- Secondary reviews: visible to case submitter, org members, and participants
CREATE POLICY "Submitters can view secondary reviews"
  ON public.secondary_reviews FOR SELECT
  USING (
    case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
  );

CREATE POLICY "Org members can view secondary reviews"
  ON public.secondary_reviews FOR SELECT
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.profiles p ON p.org_id = c.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Participants can view secondary reviews"
  ON public.secondary_reviews FOR SELECT
  USING (
    id IN (SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid())
  );

-- Participants: visible to case submitter, org members, and other participants
CREATE POLICY "Submitters can view participants"
  ON public.secondary_participants FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT id FROM public.secondary_reviews
      WHERE case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
    )
  );

CREATE POLICY "Org members can view participants"
  ON public.secondary_participants FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT sr.id FROM public.secondary_reviews sr
      JOIN public.cases c ON c.id = sr.case_id
      JOIN public.profiles p ON p.org_id = c.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Participants can view other participants"
  ON public.secondary_participants FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid()
    )
  );

-- Forum threads: same visibility as secondary reviews
CREATE POLICY "Authorized users can view forum threads"
  ON public.forum_threads FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT id FROM public.secondary_reviews
      WHERE case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
      OR id IN (SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid())
      OR case_id IN (
        SELECT c.id FROM public.cases c
        JOIN public.profiles p ON p.org_id = c.org_id
        WHERE p.id = auth.uid()
      )
    )
  );

-- Forum posts: same visibility as threads
CREATE POLICY "Authorized users can view forum posts"
  ON public.forum_posts FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM public.forum_threads
      WHERE secondary_review_id IN (
        SELECT id FROM public.secondary_reviews
        WHERE case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
        OR id IN (SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid())
        OR case_id IN (
          SELECT c.id FROM public.cases c
          JOIN public.profiles p ON p.org_id = c.org_id
          WHERE p.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can create forum posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    thread_id IN (
      SELECT ft.id FROM public.forum_threads ft
      JOIN public.secondary_participants sp ON sp.secondary_review_id = ft.secondary_review_id
      WHERE sp.user_id = auth.uid() AND sp.is_active = TRUE
    )
  );

CREATE POLICY "Authors can update own posts"
  ON public.forum_posts FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Re-ratings: visible to case submitter, org members, and participants
CREATE POLICY "Authorized users can view reratings"
  ON public.secondary_reratings FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT id FROM public.secondary_reviews
      WHERE case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
      OR id IN (SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid())
      OR case_id IN (
        SELECT c.id FROM public.cases c
        JOIN public.profiles p ON p.org_id = c.org_id
        WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Participants can submit reratings"
  ON public.secondary_reratings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    secondary_review_id IN (
      SELECT secondary_review_id FROM public.secondary_participants
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Outcomes: same visibility as secondary reviews
CREATE POLICY "Authorized users can view outcomes"
  ON public.secondary_outcomes FOR SELECT
  USING (
    secondary_review_id IN (
      SELECT id FROM public.secondary_reviews
      WHERE case_id IN (SELECT id FROM public.cases WHERE submitter_id = auth.uid())
      OR id IN (SELECT secondary_review_id FROM public.secondary_participants WHERE user_id = auth.uid())
      OR case_id IN (
        SELECT c.id FROM public.cases c
        JOIN public.profiles p ON p.org_id = c.org_id
        WHERE p.id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.secondary_reviews IS 'Phase 3: Secondary review session for cases with intermediate/indeterminate scores';
COMMENT ON TABLE public.secondary_participants IS 'Participants in secondary review (original reviewers + peer surgeons)';
COMMENT ON TABLE public.forum_threads IS 'Discussion threads for secondary review forum';
COMMENT ON TABLE public.forum_posts IS 'Individual posts/comments in forum threads';
COMMENT ON TABLE public.secondary_reratings IS 'Re-ratings submitted by participants';
COMMENT ON TABLE public.secondary_outcomes IS 'Final adjusted scores and summary assessment';
