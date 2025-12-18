// Database types for First Principles
// These types mirror the Supabase database schema

export type OrganizationType = 'hospital' | 'private_practice' | 'aco' | 'other';

export type UserRole = 'CLINICIAN' | 'EXPERT_REVIEWER' | 'ORG_ADMIN' | 'SYS_ADMIN';

export type CaseStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'FAILED';

export type AnatomyRegion = 'LUMBAR' | 'CERVICAL' | 'THORACIC' | 'OTHER';

export type ReviewStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export type PreferredApproach = 'DECOMPRESSION_ONLY' | 'PLF' | 'TLIF' | 'ALIF' | 'OTHER';

export type FinalClass = 'APPROPRIATE' | 'UNCERTAIN' | 'INAPPROPRIATE';

export type NotificationType = 'CASE_ASSIGNED' | 'CASE_RESULT_READY' | 'REVIEW_REMINDER' | 'SYSTEM_MESSAGE';

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
  surgery_indicated: boolean | null;
  fusion_indicated: boolean | null;
  preferred_approach: PreferredApproach | null;
  appropriateness_score: number | null;
  successful_outcome_likely: boolean | null;
  optimization_recommended: boolean | null;
  missing_data_flag: boolean | null;
  missing_data_description: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
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
    };
  };
}

