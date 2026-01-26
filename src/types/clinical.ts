/**
 * Types for the 14-section comprehensive clinical case submission form.
 * All text fields that support free-form narrative use string and are
 * intended to be edited via DictationTextarea (with dictate) or Input.
 */

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | '';

export type ComorbidityOption = 'diabetes' | 'smoker' | 'obesity' | 'heart_disease' | 'osteoporosis';

/** 1) Case number and data submission */
export interface Section1CaseNumber {
  case_number: string;
  submission_date: string; // ISO date or ''
  anatomy_region: 'LUMBAR' | 'CERVICAL' | 'THORACIC' | 'OTHER';
}

/** 2) History */
export interface Section2History {
  // 2a — (Age) year old (Gender) with (no major / following conditions)
  age: string;
  gender: Gender;
  comorbidities_mode: 'none' | 'following';
  comorbidities_list: {
    diabetes: boolean;
    smoker: boolean;
    obesity: boolean;
    heart_disease: boolean;
    osteoporosis: boolean;
    other: string; // dictation
  };

  // 2b — Presents with: no symptoms / following symptoms
  presents_with_mode: 'no_symptoms' | 'following';
  duration: string; // select value
  primary_symptom_complex: string; // select
  back_symptoms: {
    specified: boolean;
    laterality: 'left' | 'right' | 'bilateral' | '';
    symptom_type: string; // e.g. pain, numbness, weakness — select or dictation
  };
  leg_symptoms: {
    specified: boolean;
    laterality: 'left' | 'right' | 'bilateral' | '';
    symptom_type: string;
  };
  back_leg_proportionality: 'leg_dominant' | 'back_dominant' | 'equal' | ''; // if both back and leg

  // 2b.vi Character
  pain_intensity: string; // 1-10 or ''
  pain_frequency: string; // select
  aggravating_factors: string; // None / not reported / dictation
  alleviating_factors: string;
  reported_observed_debility: string; // dictation

  // 2c–f
  dependency_issues: string; // dictation
  psychological_factors: string; // dictation
  relevant_social_factors: string; // dictation

  // 2f Conservative care
  conservative_care_applicable: boolean;
  conservative_duration: string;
  conservative_degree_of_improvement: string; // select
  conservative_type_medical: boolean;
  conservative_type_other: boolean;
  conservative_type_other_desc: string; // dictation
}

/** 3) Physical Exam */
export interface Section3PhysicalExam {
  neuro_findings_mode: 'normal' | 'abnormal';
  motor_grade: string;
  sensory: string; // dictation
  gait: string; // dictation
  reflex: string; // dictation
  sphincter: string; // dictation
  provocative_tests: string; // dictation
  observed_disability_grade: string; // select
}

/** 4) Previous surgery */
export interface Section4PriorSurgery {
  applicable: boolean;
  levels_and_procedure: string; // dictation
  level_of_improvement: string; // select
  primary_reason_for_revision: string; // dictation
}

/** 5) Diagnostic (pathology driving decision making) */
export interface Section5Diagnostic {
  pathology_driving_decision: string; // dictation / narrative; diagnosis_codes at top level
}

/** 6) Primary structural pathology — per-segment and global */
export interface SpineSegmentPathology {
  level: string; // e.g. L4-L5
  neural_compression: 'none' | 'present';
  neural_central: boolean;
  neural_lateral: boolean;
  spondylosis: 'none' | 'present';
  spondylosis_disc: boolean;
  spondylosis_alignment: boolean;
  other_degenerative: string; // dictation
}

export interface Section6StructuralPathology {
  segments: SpineSegmentPathology[];
  structural_changes_prior_surgery: string; // if revision; dictation
  diffuse_adjacent_levels: string; // dictation
}

/** 7) Correlative tests */
export interface Section7CorrelativeTests {
  mode: 'none' | 'present';
  emg_positive: boolean;
  emg_distributions: string; // dictation
  nerve_root_blocks: boolean;
  nerve_root_blocks_percent_improvement: string;
  nerve_root_blocks_duration: string;
  other: string; // dictation
}

/** 8) Other major symptomatic joint arthrosis */
export interface Section8OtherArthrosis {
  applicable: boolean;
  description: string; // dictation
}

/** 9) Other relevant patient information */
export interface Section9OtherRelevant {
  information: string; // dictation
}

/** 10) Procedure */
export interface SegmentProcedure {
  level: string;
  direct_decompression: boolean;
  indirect_decompression: boolean;
  fusion: boolean;
}

export interface Section10Procedure {
  primary_approach: string; // select + dictation if Other
  primary_approach_other: string; // dictation when approach is Other
  segments: SegmentProcedure[];
}

/** 11) Images discussion */
export interface Section11Images {
  discussion: string; // dictation
}

/** 12) Surgical justification */
export interface Section12SurgicalJustification {
  justification: string; // dictation — maps to free_text_summary
}

/** 13) Other relevant comments */
export interface Section13OtherComments {
  comments: string; // dictation
}

/** 14) CPT — codes at top level; discussion here */
export interface Section14CPT {
  discussion: string; // dictation; proposed_procedure_codes at CaseFormData top level
}

export interface ClinicalData {
  section1: Section1CaseNumber;
  section2: Section2History;
  section3: Section3PhysicalExam;
  section4: Section4PriorSurgery;
  section5: Section5Diagnostic;
  section6: Section6StructuralPathology;
  section7: Section7CorrelativeTests;
  section8: Section8OtherArthrosis;
  section9: Section9OtherRelevant;
  section10: Section10Procedure;
  section11: Section11Images;
  section12: Section12SurgicalJustification;
  section13: Section13OtherComments;
  section14: Section14CPT;
}

export function createEmptyClinicalData(): ClinicalData {
  return {
    section1: {
      case_number: '',
      submission_date: '',
      anatomy_region: 'LUMBAR',
    },
    section2: {
      age: '',
      gender: '',
      comorbidities_mode: 'none',
      comorbidities_list: {
        diabetes: false,
        smoker: false,
        obesity: false,
        heart_disease: false,
        osteoporosis: false,
        other: '',
      },
      presents_with_mode: 'no_symptoms',
      duration: '',
      primary_symptom_complex: '',
      back_symptoms: { specified: false, laterality: '', symptom_type: '' },
      leg_symptoms: { specified: false, laterality: '', symptom_type: '' },
      back_leg_proportionality: '',
      pain_intensity: '',
      pain_frequency: '',
      aggravating_factors: '',
      alleviating_factors: '',
      reported_observed_debility: '',
      dependency_issues: '',
      psychological_factors: '',
      relevant_social_factors: '',
      conservative_care_applicable: false,
      conservative_duration: '',
      conservative_degree_of_improvement: '',
      conservative_type_medical: false,
      conservative_type_other: false,
      conservative_type_other_desc: '',
    },
    section3: {
      neuro_findings_mode: 'normal',
      motor_grade: '',
      sensory: '',
      gait: '',
      reflex: '',
      sphincter: '',
      provocative_tests: '',
      observed_disability_grade: '',
    },
    section4: {
      applicable: false,
      levels_and_procedure: '',
      level_of_improvement: '',
      primary_reason_for_revision: '',
    },
    section5: { pathology_driving_decision: '' },
    section6: {
      segments: [],
      structural_changes_prior_surgery: '',
      diffuse_adjacent_levels: '',
    },
    section7: {
      mode: 'none',
      emg_positive: false,
      emg_distributions: '',
      nerve_root_blocks: false,
      nerve_root_blocks_percent_improvement: '',
      nerve_root_blocks_duration: '',
      other: '',
    },
    section8: { applicable: false, description: '' },
    section9: { information: '' },
    section10: {
      primary_approach: '',
      primary_approach_other: '',
      segments: [],
    },
    section11: { discussion: '' },
    section12: { justification: '' },
    section13: { comments: '' },
    section14: { discussion: '' },
  };
}
