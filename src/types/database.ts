// Database types for First Principles
// These types mirror the Supabase database schema

export type OrganizationType = 'hospital' | 'private_practice' | 'aco' | 'other';

export type UserRole = 'CLINICIAN' | 'EXPERT_REVIEWER' | 'ORG_ADMIN' | 'SYS_ADMIN';

export type CaseStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'FAILED' | 'SCORED_FINAL';

export type AnatomyRegion = 'LUMBAR' | 'CERVICAL' | 'THORACIC' | 'OTHER';

export type ReviewStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'STOPPED_INSUFFICIENT_DATA';

export type PreferredApproach = 'DECOMPRESSION_ONLY' | 'PLF' | 'TLIF' | 'ALIF' | 'OTHER';

/** Phase 1: Rationale factors for Step 5 (multi-select) */
export type RationaleFactor =
  | 'SYMPTOM_SEVERITY'
  | 'SYMPTOM_DURATION'
  | 'FUNCTIONAL_DISABILITY'
  | 'STRUCTURAL_ABNORMALITY_PRESENT'
  | 'EXAM_FINDINGS'
  | 'SYMPTOM_STRUCTURE_CORRELATION'
  | 'FAILED_CONSERVATIVE_THERAPY'
  | 'PSYCHOSOCIAL_FACTORS'
  | 'COMORBIDITIES'
  | 'OTHER';

export type FinalClass = 'APPROPRIATE' | 'UNCERTAIN' | 'INAPPROPRIATE';

export type NotificationType = 'CASE_ASSIGNED' | 'CASE_RESULT_READY' | 'REVIEW_REMINDER' | 'SYSTEM_MESSAGE' | 'REVIEW_CLARIFICATION' | 'CLARIFICATION_REQUEST';

export type ClarificationSenderType = 'SYSTEM' | 'REVIEWER' | 'CLINICIAN';
export type ClarificationMessageType = 'QUESTION' | 'ANSWER' | 'INFO';

/** Phase 2: Aggregation status per case */
export type AggregationStatus =
  | 'AWAITING_REVIEWS'
  | 'NEEDS_MORE_INFO'
  | 'SCORED_PRIMARY'
  | 'SECONDARY_REVIEW_REQUIRED';

/** Phase 2: Concordance tier for binary questions (upper/middle/lower third) */
export type ConcordanceTier = 'HIGH' | 'INTERMEDIATE' | 'LOW';

/** Phase 2: Likert classification (1–3, 4–6, 7–9) */
export type LikertClass = 'INAPPROPRIATE' | 'UNCERTAIN' | 'APPROPRIATE';

/** Phase 2: Reasons for triggering secondary review */
export type SecondaryReviewReason =
  | 'UNCERTAIN_APPROPRIATENESS_MEAN'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_JUSTIFICATION'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_OVERALL_PLAN_ACCEPTABLE'
  | 'INTERMEDIATE_CONCORDANCE_ON_WOULD_PERSONALLY_PRESCRIBE'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_SURGERY_NOW'
  | 'INTERMEDIATE_CONCORDANCE_ON_BENEFIT_FROM_MORE_NONSURGICAL_FIRST'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_DECOMPRESSION_PLAN_ACCEPTABLE'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_DECOMPRESSION_NOW'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_FUSION_PLAN_ACCEPTABLE'
  | 'INTERMEDIATE_CONCORDANCE_ON_AGREE_NEED_ANY_FUSION_NOW'
  | 'INSUFFICIENT_REVIEWS'
  | 'MISSING_KEY_FIELDS';

/** Phase 3: Secondary review status */
export type SecondaryReviewStatus =
  | 'CREATED'
  | 'FORUM_OPEN'
  | 'RERATING_OPEN'
  | 'LOCKED_SCORING'
  | 'COMPLETED'
  | 'CANCELLED';

/** Phase 3: Participant role in secondary review */
export type SecondaryParticipantRole = 'ORIGINAL_REVIEWER' | 'PEER_SURGEON' | 'MODERATOR' | 'ADMIN';

/** Phase 3: Forum post type */
export type ForumPostType = 'COMMENT' | 'QUESTION' | 'ANSWER' | 'MOD_NOTE';

// ============================================
// Database Table Types
// ============================================

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  region: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  npi_number: string | null;
  specialties: string[];
  is_expert_certified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  org_id: string;
  submitter_id: string;
  status: CaseStatus;
  patient_pseudo_id: string;
  anatomy_region: AnatomyRegion;
  diagnosis_codes: string[];
  proposed_procedure_codes: string[];
  symptom_profile: Record<string, unknown>;
  neuro_deficits: Record<string, unknown>;
  prior_surgery: boolean;
  prior_surgery_details: string | null;
  comorbidities: Record<string, unknown>;
  conservative_care: Record<string, unknown>;
  free_text_summary: string | null;
  imaging_paths: string[];
  clinical_data?: Record<string, unknown> | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  case_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  // Legacy (kept for backward compat / clarification flow)
  surgery_indicated: boolean | null;
  fusion_indicated: boolean | null;
  preferred_approach: PreferredApproach | null;
  appropriateness_score: number | null;
  successful_outcome_likely: boolean | null;
  optimization_recommended: boolean | null;
  missing_data_flag: boolean | null;
  missing_data_description: string | null;
  comments: string | null;
  clarification_completed: boolean | null;
  // Phase 1: Step 1 – Data sufficiency
  sufficient_info: boolean | null;
  info_deficiencies: string | null;
  more_than_necessary: boolean | null;
  info_burden_items: string | null;
  // Phase 1: Step 2 – Justification
  agree_justification: boolean | null;
  justification_comment: string | null;
  // Phase 1: Step 3 – Care pathway
  agree_overall_plan_acceptable: boolean | null;
  would_personally_prescribe: boolean | null;
  preferred_procedure_text: string | null;
  agree_need_any_surgery_now: boolean | null;
  benefit_from_more_nonsurgical_first: boolean | null;
  proposed_nonsurgical_therapies_text: string | null;
  agree_decompression_plan_acceptable: boolean | null;
  agree_need_any_decompression_now: boolean | null;
  suggested_decompression_text: string | null;
  agree_fusion_plan_acceptable: boolean | null;
  agree_need_any_fusion_now: boolean | null;
  suggested_fusion_text: string | null;
  // Phase 1: Step 4 – necessity (appropriateness_score already above)
  necessity_score: number | null;
  // Phase 1: Step 5 – Rationale
  rationale_factors: RationaleFactor[] | null;
  rationale_other_text: string | null;
  final_comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewClarification {
  id: string;
  review_id: string;
  sender_type: ClarificationSenderType;
  sender_id: string | null;
  message: string;
  message_type: ClarificationMessageType;
  created_at: string;
}

export interface CaseResult {
  id: string;
  case_id: string;
  final_class: FinalClass;
  mean_score: number | null;
  score_std_dev: number | null;
  num_reviews: number | null;
  percent_agreed_with_proposed: number | null;
  percent_recommended_alternative: number | null;
  generated_at: string;
}

/** Phase 2: Per–binary-question aggregation result */
export interface BinaryResult {
  agree_count: number;
  valid_count: number;
  agree_fraction: number;
  concordance_tier: ConcordanceTier;
  flags: string[];
}

/** Phase 2: Case aggregate record (Phase 2 outputs) */
export interface CaseAggregate {
  id: string;
  case_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  org_id: string | null;
  action_type: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Phase 3: Secondary review session */
export interface SecondaryReview {
  id: string;
  case_id: string;
  status: SecondaryReviewStatus;
  trigger_reasons: string[];
  policy_snapshot: Record<string, unknown>;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  completed_at: string | null;
}

/** Phase 3: Participant in secondary review */
export interface SecondaryParticipant {
  id: string;
  secondary_review_id: string;
  user_id: string;
  role: SecondaryParticipantRole;
  invited_at: string;
  joined_at: string | null;
  is_active: boolean;
}

/** Phase 3: Forum discussion thread */
export interface ForumThread {
  id: string;
  secondary_review_id: string;
  title: string;
  pinned_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Phase 3: Forum post/comment */
export interface ForumPost {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  type: ForumPostType;
  created_at: string;
  updated_at: string;
}

/** Phase 3: Re-rating submitted by participant */
export interface SecondaryReRating {
  id: string;
  secondary_review_id: string;
  user_id: string;
  appropriateness_score_final: number;
  necessity_score_final: number | null;
  binary_votes_final: Record<string, boolean>;
  rationale_final: string;
  changed_from_primary: boolean;
  submitted_at: string;
}

/** Phase 3: Final outcome reported to surgeon */
export interface SecondaryOutcome {
  id: string;
  secondary_review_id: string;
  adjusted_appropriateness_mean: number;
  adjusted_appropriateness_class: LikertClass;
  adjusted_necessity_mean: number | null;
  adjusted_necessity_class: LikertClass | null;
  summary_assessment: string;
  participants_count: number;
  reratings_count: number;
  reported_to_surgeon_at: string | null;
  created_at: string;
}

// ============================================
// Extended Types with Relations
// ============================================

export interface ProfileWithOrg extends Profile {
  organization: Organization;
}

export interface CaseWithRelations extends Case {
  organization: Organization;
  submitter: Profile;
  reviews?: Review[];
  result?: CaseResult | null;
}

export interface ReviewWithRelations extends Review {
  case: Case;
  reviewer: Profile;
}

// ============================================
// Supabase Database Type Definition
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      cases: {
        Row: Case;
        Insert: Omit<Case, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Case, 'id' | 'created_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
      case_results: {
        Row: CaseResult;
        Insert: Omit<CaseResult, 'id' | 'generated_at'>;
        Update: Partial<Omit<CaseResult, 'id'>>;
      };
      case_aggregates: {
        Row: CaseAggregate;
        Insert: Omit<CaseAggregate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CaseAggregate, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never;
      };
      secondary_reviews: {
        Row: SecondaryReview;
        Insert: Omit<SecondaryReview, 'id' | 'created_at'>;
        Update: Partial<Omit<SecondaryReview, 'id' | 'created_at'>>;
      };
      secondary_participants: {
        Row: SecondaryParticipant;
        Insert: Omit<SecondaryParticipant, 'id' | 'invited_at'>;
        Update: Partial<Omit<SecondaryParticipant, 'id' | 'invited_at'>>;
      };
      forum_threads: {
        Row: ForumThread;
        Insert: Omit<ForumThread, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ForumThread, 'id' | 'created_at'>>;
      };
      forum_posts: {
        Row: ForumPost;
        Insert: Omit<ForumPost, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ForumPost, 'id' | 'created_at'>>;
      };
      secondary_reratings: {
        Row: SecondaryReRating;
        Insert: Omit<SecondaryReRating, 'id' | 'submitted_at'>;
        Update: Partial<Omit<SecondaryReRating, 'id' | 'submitted_at'>>;
      };
      secondary_outcomes: {
        Row: SecondaryOutcome;
        Insert: Omit<SecondaryOutcome, 'id' | 'created_at'>;
        Update: Partial<Omit<SecondaryOutcome, 'id' | 'created_at'>>;
      };
    };
  };
}

