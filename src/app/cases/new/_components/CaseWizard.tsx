'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, AnatomyRegion } from '@/types/database';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { clsx } from 'clsx';
import {
  submitCase,
  updateCase,
  CaseFormData,
  SymptomProfile,
  NeuroDeficits,
  Comorbidities,
  ConservativeCare,
} from '@/lib/actions/cases';

interface CaseWizardProps {
  profile: Profile;
  existingCase?: CaseFormData & { id?: string };
}

const STEPS = [
  { number: 1, title: 'Basic Info', description: 'Patient and anatomy details' },
  { number: 2, title: 'Clinical Details', description: 'Symptoms and history' },
  { number: 3, title: 'Proposed Procedure', description: 'Diagnosis and procedure codes' },
  { number: 4, title: 'Imaging Upload', description: 'Upload imaging files' },
];

const ANATOMY_OPTIONS = [
  { value: '', label: 'Select region...' },
  { value: 'LUMBAR', label: 'Lumbar' },
  { value: 'CERVICAL', label: 'Cervical' },
  { value: 'THORACIC', label: 'Thoracic' },
  { value: 'OTHER', label: 'Other' },
];

const LEG_VS_BACK_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'leg_dominant', label: 'Leg Dominant' },
  { value: 'back_dominant', label: 'Back Dominant' },
  { value: 'equal', label: 'Equal' },
];

const initialFormData: CaseFormData = {
  patient_pseudo_id: '',
  anatomy_region: 'LUMBAR',
  symptom_summary: '',
  symptom_profile: {
    duration: '',
    leg_vs_back: undefined,
    severity: undefined,
  },
  neuro_deficits: {
    motor_weakness: false,
    sensory_loss: false,
    gait_instability: false,
    bowel_bladder: false,
  },
  prior_surgery: false,
  prior_surgery_details: '',
  comorbidities: {
    diabetes: false,
    smoker: false,
    obesity: false,
    heart_disease: false,
    osteoporosis: false,
    other: '',
  },
  conservative_care: {
    pt_tried: false,
    meds: false,
    injections: false,
    duration: '',
  },
  diagnosis_codes: [],
  proposed_procedure_codes: [],
  free_text_summary: '',
  imaging_paths: [],
};

export function CaseWizard({ profile, existingCase }: CaseWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CaseFormData>(existingCase || initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.patient_pseudo_id.trim()) {
          newErrors.patient_pseudo_id = 'Patient ID is required';
        }
        if (!formData.anatomy_region) {
          newErrors.anatomy_region = 'Anatomy region is required';
        }
        if (!formData.symptom_summary.trim()) {
          newErrors.symptom_summary = 'Symptom summary is required';
        }
        break;
      case 2:
        if (!formData.symptom_profile.duration?.trim()) {
          newErrors.duration = 'Duration is required';
        }
        if (!formData.symptom_profile.leg_vs_back) {
          newErrors.leg_vs_back = 'Pain distribution is required';
        }
        if (!formData.symptom_profile.severity || formData.symptom_profile.severity < 1 || formData.symptom_profile.severity > 10) {
          newErrors.severity = 'Severity (1-10) is required';
        }
        if (formData.prior_surgery && !formData.prior_surgery_details.trim()) {
          newErrors.prior_surgery_details = 'Please describe prior surgery';
        }
        break;
      case 3:
        if (formData.diagnosis_codes.length === 0) {
          newErrors.diagnosis_codes = 'At least one diagnosis code is required';
        }
        if (formData.proposed_procedure_codes.length === 0) {
          newErrors.proposed_procedure_codes = 'At least one procedure code is required';
        }
        if (!formData.free_text_summary.trim()) {
          newErrors.free_text_summary = 'Clinical rationale is required';
        }
        break;
      case 4:
        // Imaging is optional for drafts
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllSteps = (): boolean => {
    let allValid = true;
    const allErrors: Record<string, string> = {};

    // Validate step 1
    if (!formData.patient_pseudo_id.trim()) allErrors.patient_pseudo_id = 'Patient ID is required';
    if (!formData.anatomy_region) allErrors.anatomy_region = 'Anatomy region is required';
    if (!formData.symptom_summary.trim()) allErrors.symptom_summary = 'Symptom summary is required';

    // Validate step 2
    if (!formData.symptom_profile.duration?.trim()) allErrors.duration = 'Duration is required';
    if (!formData.symptom_profile.leg_vs_back) allErrors.leg_vs_back = 'Pain distribution is required';
    if (!formData.symptom_profile.severity) allErrors.severity = 'Severity is required';
    if (formData.prior_surgery && !formData.prior_surgery_details.trim()) allErrors.prior_surgery_details = 'Prior surgery details required';

    // Validate step 3
    if (formData.diagnosis_codes.length === 0) allErrors.diagnosis_codes = 'Diagnosis codes required';
    if (formData.proposed_procedure_codes.length === 0) allErrors.proposed_procedure_codes = 'Procedure codes required';
    if (!formData.free_text_summary.trim()) allErrors.free_text_summary = 'Clinical rationale required';

    setErrors(allErrors);
    allValid = Object.keys(allErrors).length === 0;

    return allValid;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step > currentStep) {
      // Validate all steps up to the target
      let canProceed = true;
      for (let i = currentStep; i < step; i++) {
        if (!validateStep(i)) {
          canProceed = false;
          break;
        }
      }
      if (canProceed) {
        setCurrentStep(step);
      }
    }
  };

  // Form updates
  const updateFormData = <K extends keyof CaseFormData>(field: K, value: CaseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateSymptomProfile = <K extends keyof SymptomProfile>(field: K, value: SymptomProfile[K]) => {
    setFormData((prev) => ({
      ...prev,
      symptom_profile: { ...prev.symptom_profile, [field]: value },
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateNeuroDeficits = <K extends keyof NeuroDeficits>(field: K, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      neuro_deficits: { ...prev.neuro_deficits, [field]: value },
    }));
  };

  const updateComorbidities = <K extends keyof Comorbidities>(field: K, value: Comorbidities[K]) => {
    setFormData((prev) => ({
      ...prev,
      comorbidities: { ...prev.comorbidities, [field]: value },
    }));
  };

  const updateConservativeCare = <K extends keyof ConservativeCare>(field: K, value: ConservativeCare[K]) => {
    setFormData((prev) => ({
      ...prev,
      conservative_care: { ...prev.conservative_care, [field]: value },
    }));
  };

  // File upload handling
  const handleFileUpload = async (files: FileList) => {
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${Date.now()}-${i}`;
      const filePath = `${profile.org_id}/${crypto.randomUUID()}/${file.name}`;

      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      try {
        const { data, error } = await supabase.storage
          .from('imaging')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        uploadedPaths.push(data.path);
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    if (uploadedPaths.length > 0) {
      setFormData((prev) => ({
        ...prev,
        imaging_paths: [...prev.imaging_paths, ...uploadedPaths],
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imaging_paths: prev.imaging_paths.filter((_, i) => i !== index),
    }));
  };

  // Submit handlers
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      if (existingCase?.id) {
        const result = await updateCase(existingCase.id, formData, true);
        if (result.success) {
          router.push(`/cases/${existingCase.id}`);
        } else {
          setErrors({ submit: result.error || 'Failed to save draft' });
        }
      } else {
        const result = await submitCase(formData, true);
        if (result.success && result.caseId) {
          router.push(`/cases/${result.caseId}`);
        } else {
          setErrors({ submit: result.error || 'Failed to save draft' });
        }
      }
    } catch (err) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingCase?.id) {
        const result = await updateCase(existingCase.id, formData, false);
        if (result.success) {
          router.push(`/cases/${existingCase.id}`);
        } else {
          setErrors({ submit: result.error || 'Failed to submit case' });
        }
      } else {
        const result = await submitCase(formData, false);
        if (result.success && result.caseId) {
          router.push(`/cases/${result.caseId}`);
        } else {
          setErrors({ submit: result.error || 'Failed to submit case' });
        }
      }
    } catch (err) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo formData={formData} errors={errors} updateFormData={updateFormData} />;
      case 2:
        return (
          <Step2ClinicalDetails
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            updateSymptomProfile={updateSymptomProfile}
            updateNeuroDeficits={updateNeuroDeficits}
            updateComorbidities={updateComorbidities}
            updateConservativeCare={updateConservativeCare}
          />
        );
      case 3:
        return <Step3ProposedProcedure formData={formData} errors={errors} updateFormData={updateFormData} />;
      case 4:
        return (
          <Step4ImagingUpload
            formData={formData}
            errors={errors}
            handleFileUpload={handleFileUpload}
            removeFile={removeFile}
            uploadProgress={uploadProgress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <button
                onClick={() => goToStep(step.number)}
                className={clsx(
                  'flex items-center gap-3 transition-colors',
                  step.number <= currentStep ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all',
                    step.number === currentStep
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : step.number < currentStep
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {step.number < currentStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={clsx(
                      'text-sm font-medium',
                      step.number === currentStep ? 'text-blue-700' : step.number < currentStep ? 'text-slate-700' : 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500">{step.description}</p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'hidden md:block w-16 lg:w-24 h-0.5 mx-4',
                    step.number < currentStep ? 'bg-blue-300' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">{renderStep()}</Card>

      {/* Error message */}
      {errors.submit && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.submit}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentStep === 4 && (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={isSubmitting} isLoading={isSubmitting}>
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
                Submit for Review
              </Button>
            </>
          )}
          {currentStep < 4 && (
            <Button onClick={handleNext}>
              Next
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP 1: BASIC INFO
// ============================================
interface Step1Props {
  formData: CaseFormData;
  errors: Record<string, string>;
  updateFormData: <K extends keyof CaseFormData>(field: K, value: CaseFormData[K]) => void;
}

function Step1BasicInfo({ formData, errors, updateFormData }: Step1Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-subheading text-slate-900 mb-2">Basic Case Information</h2>
        <p className="text-caption">Enter patient identifier and primary anatomical region</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Patient Pseudo ID"
          placeholder="e.g., PT-2024-001"
          value={formData.patient_pseudo_id}
          onChange={(e) => updateFormData('patient_pseudo_id', e.target.value)}
          error={errors.patient_pseudo_id}
          hint="De-identified patient identifier"
        />

        <Select
          label="Anatomy Region"
          options={ANATOMY_OPTIONS}
          value={formData.anatomy_region}
          onChange={(e) => updateFormData('anatomy_region', e.target.value as AnatomyRegion)}
          error={errors.anatomy_region}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Symptom Summary</label>
        <textarea
          value={formData.symptom_summary}
          onChange={(e) => updateFormData('symptom_summary', e.target.value)}
          placeholder="Brief summary of patient's primary symptoms..."
          rows={4}
          className={clsx(
            'w-full rounded-lg border bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors',
            'focus:outline-none focus:ring-2',
            errors.symptom_summary
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
          )}
        />
        {errors.symptom_summary && <p className="mt-1.5 text-sm text-red-600">{errors.symptom_summary}</p>}
      </div>
    </div>
  );
}

// ============================================
// STEP 2: CLINICAL DETAILS
// ============================================
interface Step2Props {
  formData: CaseFormData;
  errors: Record<string, string>;
  updateFormData: <K extends keyof CaseFormData>(field: K, value: CaseFormData[K]) => void;
  updateSymptomProfile: <K extends keyof SymptomProfile>(field: K, value: SymptomProfile[K]) => void;
  updateNeuroDeficits: <K extends keyof NeuroDeficits>(field: K, value: boolean) => void;
  updateComorbidities: <K extends keyof Comorbidities>(field: K, value: Comorbidities[K]) => void;
  updateConservativeCare: <K extends keyof ConservativeCare>(field: K, value: ConservativeCare[K]) => void;
}

function Step2ClinicalDetails({
  formData,
  errors,
  updateFormData,
  updateSymptomProfile,
  updateNeuroDeficits,
  updateComorbidities,
  updateConservativeCare,
}: Step2Props) {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-subheading text-slate-900 mb-2">Clinical Details</h2>
        <p className="text-caption">Detailed symptom profile and patient history</p>
      </div>

      {/* Symptom Profile */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Symptom Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Duration"
            placeholder="e.g., 6 months"
            value={formData.symptom_profile.duration || ''}
            onChange={(e) => updateSymptomProfile('duration', e.target.value)}
            error={errors.duration}
          />
          <Select
            label="Pain Distribution"
            options={LEG_VS_BACK_OPTIONS}
            value={formData.symptom_profile.leg_vs_back || ''}
            onChange={(e) => updateSymptomProfile('leg_vs_back', e.target.value as SymptomProfile['leg_vs_back'])}
            error={errors.leg_vs_back}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Severity (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.symptom_profile.severity || ''}
              onChange={(e) => updateSymptomProfile('severity', parseInt(e.target.value) || undefined)}
              className={clsx(
                'w-full rounded-lg border bg-white px-4 py-2.5 text-slate-900 transition-colors',
                'focus:outline-none focus:ring-2',
                errors.severity
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              )}
            />
            {errors.severity && <p className="mt-1.5 text-sm text-red-600">{errors.severity}</p>}
          </div>
        </div>
      </div>

      {/* Neurological Deficits */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Neurological Deficits</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'motor_weakness' as const, label: 'Motor Weakness' },
            { key: 'sensory_loss' as const, label: 'Sensory Loss' },
            { key: 'gait_instability' as const, label: 'Gait Instability' },
            { key: 'bowel_bladder' as const, label: 'Bowel/Bladder Dysfunction' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.neuro_deficits[key]}
                onChange={(e) => updateNeuroDeficits(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Prior Surgery */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Prior Surgery</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={formData.prior_surgery}
              onChange={(e) => updateFormData('prior_surgery', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Patient has had prior spine surgery</span>
          </label>
          {formData.prior_surgery && (
            <Input
              label="Prior Surgery Details"
              placeholder="Describe prior surgical procedures..."
              value={formData.prior_surgery_details}
              onChange={(e) => updateFormData('prior_surgery_details', e.target.value)}
              error={errors.prior_surgery_details}
            />
          )}
        </div>
      </div>

      {/* Comorbidities */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Comorbidities</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'diabetes' as const, label: 'Diabetes' },
            { key: 'smoker' as const, label: 'Smoker' },
            { key: 'obesity' as const, label: 'Obesity (BMI > 30)' },
            { key: 'heart_disease' as const, label: 'Heart Disease' },
            { key: 'osteoporosis' as const, label: 'Osteoporosis' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.comorbidities[key] as boolean}
                onChange={(e) => updateComorbidities(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
        <Input
          label="Other Comorbidities"
          placeholder="List any other relevant conditions..."
          value={formData.comorbidities.other}
          onChange={(e) => updateComorbidities('other', e.target.value)}
        />
      </div>

      {/* Conservative Care */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Conservative Care Tried</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'pt_tried' as const, label: 'Physical Therapy' },
            { key: 'meds' as const, label: 'Medications' },
            { key: 'injections' as const, label: 'Injections' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.conservative_care[key] as boolean}
                onChange={(e) => updateConservativeCare(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
        <Input
          label="Duration of Conservative Care"
          placeholder="e.g., 3 months"
          value={formData.conservative_care.duration}
          onChange={(e) => updateConservativeCare('duration', e.target.value)}
        />
      </div>
    </div>
  );
}

// ============================================
// STEP 3: PROPOSED PROCEDURE
// ============================================
interface Step3Props {
  formData: CaseFormData;
  errors: Record<string, string>;
  updateFormData: <K extends keyof CaseFormData>(field: K, value: CaseFormData[K]) => void;
}

function Step3ProposedProcedure({ formData, errors, updateFormData }: Step3Props) {
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [procedureInput, setProcedureInput] = useState('');

  const addDiagnosisCode = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed && !formData.diagnosis_codes.includes(trimmed)) {
      updateFormData('diagnosis_codes', [...formData.diagnosis_codes, trimmed]);
    }
    setDiagnosisInput('');
  };

  const removeDiagnosisCode = (index: number) => {
    updateFormData('diagnosis_codes', formData.diagnosis_codes.filter((_, i) => i !== index));
  };

  const addProcedureCode = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed && !formData.proposed_procedure_codes.includes(trimmed)) {
      updateFormData('proposed_procedure_codes', [...formData.proposed_procedure_codes, trimmed]);
    }
    setProcedureInput('');
  };

  const removeProcedureCode = (index: number) => {
    updateFormData('proposed_procedure_codes', formData.proposed_procedure_codes.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, addFn: (code: string) => void, input: string) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFn(input);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-subheading text-slate-900 mb-2">Proposed Procedure</h2>
        <p className="text-caption">Enter diagnosis and procedure codes with clinical rationale</p>
      </div>

      {/* Diagnosis Codes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Diagnosis Codes (ICD-10)</label>
        <div className="space-y-2">
          {formData.diagnosis_codes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.diagnosis_codes.map((code, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-mono"
                >
                  {code}
                  <button
                    onClick={() => removeDiagnosisCode(index)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={diagnosisInput}
              onChange={(e) => setDiagnosisInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addDiagnosisCode, diagnosisInput)}
              placeholder="Enter ICD-10 code and press Enter"
              className={clsx(
                'flex-1 rounded-lg border bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors',
                'focus:outline-none focus:ring-2',
                errors.diagnosis_codes
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              )}
            />
            <Button variant="secondary" onClick={() => addDiagnosisCode(diagnosisInput)}>
              Add
            </Button>
          </div>
          {errors.diagnosis_codes && <p className="text-sm text-red-600">{errors.diagnosis_codes}</p>}
        </div>
      </div>

      {/* Procedure Codes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Proposed Procedure Codes (CPT)</label>
        <div className="space-y-2">
          {formData.proposed_procedure_codes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.proposed_procedure_codes.map((code, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-mono"
                >
                  {code}
                  <button
                    onClick={() => removeProcedureCode(index)}
                    className="text-blue-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={procedureInput}
              onChange={(e) => setProcedureInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addProcedureCode, procedureInput)}
              placeholder="Enter CPT code and press Enter"
              className={clsx(
                'flex-1 rounded-lg border bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors',
                'focus:outline-none focus:ring-2',
                errors.proposed_procedure_codes
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              )}
            />
            <Button variant="secondary" onClick={() => addProcedureCode(procedureInput)}>
              Add
            </Button>
          </div>
          {errors.proposed_procedure_codes && <p className="text-sm text-red-600">{errors.proposed_procedure_codes}</p>}
        </div>
      </div>

      {/* Free Text Summary */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Clinical Rationale</label>
        <textarea
          value={formData.free_text_summary}
          onChange={(e) => updateFormData('free_text_summary', e.target.value)}
          placeholder="Explain the clinical rationale for the proposed surgical intervention..."
          rows={6}
          className={clsx(
            'w-full rounded-lg border bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors',
            'focus:outline-none focus:ring-2',
            errors.free_text_summary
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
          )}
        />
        {errors.free_text_summary && <p className="mt-1.5 text-sm text-red-600">{errors.free_text_summary}</p>}
      </div>
    </div>
  );
}

// ============================================
// STEP 4: IMAGING UPLOAD
// ============================================
interface Step4Props {
  formData: CaseFormData;
  errors: Record<string, string>;
  handleFileUpload: (files: FileList) => void;
  removeFile: (index: number) => void;
  uploadProgress: Record<string, number>;
}

function Step4ImagingUpload({ formData, errors, handleFileUpload, removeFile, uploadProgress }: Step4Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-subheading text-slate-900 mb-2">Imaging Upload</h2>
        <p className="text-caption">Upload relevant imaging files (MRI, CT, X-ray)</p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        )}
      >
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.dcm,.zip"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-1">Drop files here or click to upload</p>
          <p className="text-sm text-slate-500">Supports JPEG, PNG, PDF, DICOM, ZIP up to 50MB</p>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            progress < 100 && (
              <div key={fileId} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm text-slate-500">{progress}%</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {formData.imaging_paths.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Uploaded Files ({formData.imaging_paths.length})</h3>
          <div className="space-y-2">
            {formData.imaging_paths.map((path, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{getFileName(path)}</p>
                    <p className="text-xs text-slate-500">Uploaded successfully</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Imaging is optional</p>
            <p className="text-sm text-amber-700 mt-1">
              You can save as draft and upload imaging files later, or submit without imaging if not available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

