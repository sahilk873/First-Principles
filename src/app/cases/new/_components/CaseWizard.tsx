'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DictationTextarea } from '@/components/ui/DictationTextarea';
import { clsx } from 'clsx';
import { submitCase, updateCase, CaseFormData } from '@/lib/actions/cases';
import {
  createEmptyClinicalData,
  type ClinicalData,
  type SpineSegmentPathology,
  type SegmentProcedure,
} from '@/types/clinical';

interface CaseWizardProps {
  profile: Profile;
  existingCase?: CaseFormData & { id?: string };
}

const TOTAL_STEPS = 9;

const STEPS = [
  { number: 1, title: 'Case Number & Submission', description: 'Case number, date, anatomy' },
  { number: 2, title: 'History', description: 'Demographics, symptoms, character, conservative care' },
  { number: 3, title: 'Physical Exam', description: 'Neuro exam, observed disability' },
  { number: 4, title: 'Previous Surgery', description: 'Levels, improvement, reason for revision' },
  { number: 5, title: 'Diagnostic & Structural Pathology', description: 'Pathology, segments, neural compression' },
  { number: 6, title: 'Correlative, Arthrosis, Other', description: 'EMG, nerve blocks, other joints, other info' },
  { number: 7, title: 'Procedure & Images', description: 'Approach, segment procedures, images discussion' },
  { number: 8, title: 'Justification, Comments, CPT', description: 'Surgical justification, comments, CPT codes' },
  { number: 9, title: 'Imaging Upload', description: 'Upload imaging files' },
];

// Select options
const ANATOMY_OPTIONS = [
  { value: 'LUMBAR', label: 'Lumbar' },
  { value: 'CERVICAL', label: 'Cervical' },
  { value: 'THORACIC', label: 'Thoracic' },
  { value: 'OTHER', label: 'Other' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: '', label: 'Select duration...' },
  { value: '<3mo', label: '< 3 months' },
  { value: '3-6mo', label: '3–6 months' },
  { value: '6-12mo', label: '6–12 months' },
  { value: '1-2y', label: '1–2 years' },
  { value: '>2y', label: '> 2 years' },
];

const PRIMARY_SYMPTOM_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'axial_back_pain', label: 'Axial back pain' },
  { value: 'radicular_leg_pain', label: 'Radicular leg pain' },
  { value: 'neurogenic_claudication', label: 'Neurogenic claudication' },
  { value: 'myelopathy', label: 'Myelopathy' },
  { value: 'radiculopathy', label: 'Radiculopathy' },
  { value: 'mechanical_instability', label: 'Mechanical instability' },
  { value: 'other', label: 'Other' },
];

const LATERALITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bilateral', label: 'Bilateral' },
];

const PROPORTIONALITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'leg_dominant', label: 'Leg dominant' },
  { value: 'back_dominant', label: 'Back dominant' },
  { value: 'equal', label: 'Equal' },
];

const PAIN_FREQUENCY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'constant', label: 'Constant' },
  { value: 'daily', label: 'Daily' },
  { value: 'intermittent', label: 'Intermittent' },
  { value: 'with_activity', label: 'With activity' },
  { value: 'at_rest', label: 'At rest' },
];

const MODIFYING_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Not reported', label: 'Not reported' },
  { value: 'Custom', label: 'Describe (dictate or type)...' },
];

const DEGREE_OF_IMPROVEMENT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'significant', label: 'Significant' },
];

const OBSERVED_DISABILITY_GRADE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: '0', label: 'Grade 0' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
  { value: '5', label: 'Grade 5' },
];

const MOTOR_GRADE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: '0', label: '0/5' },
  { value: '1', label: '1/5' },
  { value: '2', label: '2/5' },
  { value: '3', label: '3/5' },
  { value: '4', label: '4/5' },
  { value: '5', label: '5/5' },
];

const PRIOR_SURGERY_IMPROVEMENT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'significant', label: 'Significant' },
  { value: 'recurrence', label: 'Recurrence' },
];

const PRIMARY_APPROACH_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'DECOMPRESSION_ONLY', label: 'Decompression only' },
  { value: 'PLF', label: 'PLF' },
  { value: 'TLIF', label: 'TLIF' },
  { value: 'ALIF', label: 'ALIF' },
  { value: 'OTHER', label: 'Other' },
];

function initialFormData(existing?: CaseFormData & { id?: string }): CaseFormData {
  const base = {
    diagnosis_codes: existing?.diagnosis_codes ?? [],
    proposed_procedure_codes: existing?.proposed_procedure_codes ?? [],
    imaging_paths: existing?.imaging_paths ?? [],
    clinical_data: (existing?.clinical_data as ClinicalData | undefined) ?? createEmptyClinicalData(),
  };
  return base;
}

export function CaseWizard({ profile, existingCase }: CaseWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CaseFormData>(() => initialFormData(existingCase));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const updateSection = <S extends keyof ClinicalData>(sec: S, patch: Partial<ClinicalData[S]>) => {
    setFormData((prev) => ({
      ...prev,
      clinical_data: {
        ...prev.clinical_data,
        [sec]: { ...(prev.clinical_data[sec] as object), ...patch } as ClinicalData[S],
      },
    }));
  };

  const updateFormData = <K extends keyof CaseFormData>(field: K, value: CaseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[field as string];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    const c = formData.clinical_data;

    switch (step) {
      case 1:
        if (!c.section1.case_number.trim()) e.case_number = 'Case number is required';
        if (!c.section1.anatomy_region) e.anatomy_region = 'Anatomy region is required';
        break;
      case 2:
        // Light validation; duration required if symptoms chosen
        if (c.section2.presents_with_mode === 'following' && !c.section2.duration) e.duration = 'Duration is required when symptoms are present';
        break;
      case 5:
        if (formData.diagnosis_codes.length === 0) e.diagnosis_codes = 'At least one diagnosis code is required';
        break;
      case 8:
        if (formData.proposed_procedure_codes.length === 0) e.proposed_procedure_codes = 'At least one CPT code is required';
        if (!c.section12.justification.trim()) e.justification = 'Surgical justification is required';
        break;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateAll = (): boolean => {
    const e: Record<string, string> = {};
    const c = formData.clinical_data;
    if (!c.section1.case_number.trim()) e.case_number = 'Case number is required';
    if (!c.section1.anatomy_region) e.anatomy_region = 'Anatomy region is required';
    if (formData.diagnosis_codes.length === 0) e.diagnosis_codes = 'At least one diagnosis code is required';
    if (formData.proposed_procedure_codes.length === 0) e.proposed_procedure_codes = 'At least one CPT code is required';
    if (!c.section12.justification.trim()) e.justification = 'Surgical justification is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const goToStep = (step: number) => {
    if (step < currentStep) setCurrentStep(step);
    else if (step > currentStep) {
      let ok = true;
      for (let i = currentStep; i < step && ok; i++) ok = validateStep(i);
      if (ok) setCurrentStep(step);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const supabase = createClient();
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const id = `${Date.now()}-${i}`;
      const path = `${profile.org_id}/${crypto.randomUUID()}/${f.name}`;
      setUploadProgress((p) => ({ ...p, [id]: 0 }));
      try {
        const { data, error } = await supabase.storage.from('imaging').upload(path, f, { cacheControl: '3600', upsert: false });
        if (!error) {
          paths.push(data.path);
          setUploadProgress((p) => ({ ...p, [id]: 100 }));
        }
      } catch {}
    }
    if (paths.length) setFormData((p) => ({ ...p, imaging_paths: [...p.imaging_paths, ...paths] }));
  };

  const removeFile = (index: number) => {
    setFormData((p) => ({ ...p, imaging_paths: p.imaging_paths.filter((_, i) => i !== index) }));
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const res = existingCase?.id
        ? await updateCase(existingCase.id, formData, true)
        : await submitCase(formData, true);
      if (res.success) {
        const id = existingCase?.id ?? (res as { caseId?: string }).caseId;
        if (id) router.push(`/cases/${id}`);
      } else {
        setErrors({ submit: res.error || 'Failed to save draft' });
      }
    } catch {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      const res = existingCase?.id
        ? await updateCase(existingCase.id, formData, false)
        : await submitCase(formData, false);
      if (res.success) {
        const id = existingCase?.id ?? (res as { caseId?: string }).caseId;
        if (id) router.push(`/cases/${id}`);
      } else {
        setErrors({ submit: res.error || 'Failed to submit' });
      }
    } catch {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 data={formData.clinical_data.section1} errors={errors} update={updateSection.bind(null, 'section1')} />;
      case 2:
        return <Step2 data={formData.clinical_data.section2} errors={errors} update={updateSection.bind(null, 'section2')} />;
      case 3:
        return <Step3 data={formData.clinical_data.section3} errors={errors} update={updateSection.bind(null, 'section3')} />;
      case 4:
        return <Step4 data={formData.clinical_data.section4} errors={errors} update={updateSection.bind(null, 'section4')} />;
      case 5:
        return (
          <Step5
            section5={formData.clinical_data.section5}
            section6={formData.clinical_data.section6}
            diagnosis_codes={formData.diagnosis_codes}
            errors={errors}
            updateSection5={updateSection.bind(null, 'section5')}
            updateSection6={updateSection.bind(null, 'section6')}
            updateDiagnosisCodes={(v) => updateFormData('diagnosis_codes', v)}
          />
        );
      case 6:
        return (
          <Step6
            s7={formData.clinical_data.section7}
            s8={formData.clinical_data.section8}
            s9={formData.clinical_data.section9}
            errors={errors}
            update7={updateSection.bind(null, 'section7')}
            update8={updateSection.bind(null, 'section8')}
            update9={updateSection.bind(null, 'section9')}
          />
        );
      case 7:
        return (
          <Step7
            s10={formData.clinical_data.section10}
            s11={formData.clinical_data.section11}
            errors={errors}
            update10={updateSection.bind(null, 'section10')}
            update11={updateSection.bind(null, 'section11')}
          />
        );
      case 8:
        return (
          <Step8
            s12={formData.clinical_data.section12}
            s13={formData.clinical_data.section13}
            s14={formData.clinical_data.section14}
            proposed_procedure_codes={formData.proposed_procedure_codes}
            errors={errors}
            update12={updateSection.bind(null, 'section12')}
            update13={updateSection.bind(null, 'section13')}
            update14={updateSection.bind(null, 'section14')}
            updateCPT={(v) => updateFormData('proposed_procedure_codes', v)}
          />
        );
      case 9:
        return (
          <Step9
            imaging_paths={formData.imaging_paths}
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
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.number}
              onClick={() => goToStep(s.number)}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                s.number === currentStep ? 'bg-blue-600 text-white' : s.number < currentStep ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              <span className="font-medium">{s.number}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-6">{renderStep()}</Card>

      {errors.submit && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {currentStep === TOTAL_STEPS && (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={isSubmitting} isLoading={isSubmitting}>
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
                Submit for Review
              </Button>
            </>
          )}
          {currentStep < TOTAL_STEPS && (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step 1: Case number and data submission ---
function Step1({
  data,
  errors,
  update,
}: {
  data: ClinicalData['section1'];
  errors: Record<string, string>;
  update: (p: Partial<ClinicalData['section1']>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-subheading text-slate-900">1) Case number and data submission</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Case number"
          value={data.case_number}
          onChange={(e) => update({ case_number: e.target.value })}
          placeholder="e.g. PT-2024-001"
          error={errors.case_number}
        />
        <Input
          label="Submission date"
          type="date"
          value={data.submission_date}
          onChange={(e) => update({ submission_date: e.target.value })}
          error={errors.anatomy_region}
        />
        <Select
          label="Anatomy region"
          options={ANATOMY_OPTIONS}
          value={data.anatomy_region}
          onChange={(e) => update({ anatomy_region: e.target.value as ClinicalData['section1']['anatomy_region'] })}
          error={errors.anatomy_region}
        />
      </div>
    </div>
  );
}

// --- Step 2: History ---
function Step2({
  data,
  errors,
  update,
}: {
  data: ClinicalData['section2'];
  errors: Record<string, string>;
  update: (p: Partial<ClinicalData['section2']>) => void;
}) {
  const cl = data.comorbidities_list;
  const showSymptoms = data.presents_with_mode === 'following';
  const showProportionality = data.back_symptoms.specified && data.leg_symptoms.specified;
  const hasPain = data.primary_symptom_complex?.toLowerCase().includes('pain') || data.back_symptoms.symptom_type?.toLowerCase().includes('pain') || data.leg_symptoms.symptom_type?.toLowerCase().includes('pain');

  return (
    <div className="space-y-8">
      <h2 className="text-subheading text-slate-900">2) History</h2>

      {/* 2a — Age, Gender, Comorbidities */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">2a. Demographics and comorbidities</h3>
        <p className="text-caption text-slate-600">
          (Age) year old (Gender) with (no major medical co-morbidities / the following medical conditions relevant to spine management)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Age" type="number" value={data.age} onChange={(e) => update({ age: e.target.value })} placeholder="e.g. 52" />
          <Select label="Gender" options={GENDER_OPTIONS} value={data.gender} onChange={(e) => update({ gender: e.target.value as ClinicalData['section2']['gender'] })} />
        </div>
        <div className="space-y-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={data.comorbidities_mode === 'none'} onChange={() => update({ comorbidities_mode: 'none' })} className="text-blue-600" />
              <span className="text-sm text-slate-700">No major medical co-morbidities</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={data.comorbidities_mode === 'following'} onChange={() => update({ comorbidities_mode: 'following' })} className="text-blue-600" />
              <span className="text-sm text-slate-700">The following medical conditions</span>
            </label>
          </div>
          {data.comorbidities_mode === 'following' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-4">
              {(['diabetes', 'smoker', 'obesity', 'heart_disease', 'osteoporosis'] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cl[k]} onChange={(e) => update({ comorbidities_list: { ...cl, [k]: e.target.checked } })} className="rounded text-blue-600" />
                  <span className="text-sm text-slate-700">{k.replace('_', ' ')}</span>
                </label>
              ))}
              <DictationTextarea
                label="Other conditions"
                value={cl.other}
                onChange={(v) => update({ comorbidities_list: { ...cl, other: v } })}
                placeholder="Other relevant conditions..."
                rows={2}
              />
            </div>
          )}
        </div>
      </section>

      {/* 2b — Presents with */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">2b. Presents with</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={data.presents_with_mode === 'no_symptoms'} onChange={() => update({ presents_with_mode: 'no_symptoms' })} className="text-blue-600" />
            <span className="text-sm">No symptoms referable to the proposed procedure</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={data.presents_with_mode === 'following'} onChange={() => update({ presents_with_mode: 'following' })} className="text-blue-600" />
            <span className="text-sm">The following symptoms</span>
          </label>
        </div>

        {showSymptoms && (
          <div className="space-y-4 pl-4 border-l-2 border-slate-200">
            <Select label="Duration" options={DURATION_OPTIONS} value={data.duration} onChange={(e) => update({ duration: e.target.value })} error={errors.duration} />
            <Select label="Primary symptom complex" options={PRIMARY_SYMPTOM_OPTIONS} value={data.primary_symptom_complex} onChange={(e) => update({ primary_symptom_complex: e.target.value })} />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Back symptoms</label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={data.back_symptoms.specified} onChange={(e) => update({ back_symptoms: { ...data.back_symptoms, specified: e.target.checked } })} className="rounded text-blue-600" />
                <span className="text-sm">Specified</span>
              </label>
              {data.back_symptoms.specified && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select
                    options={LATERALITY_OPTIONS}
                    value={data.back_symptoms.laterality}
                    onChange={(e) => update({ back_symptoms: { ...data.back_symptoms, laterality: e.target.value as typeof data.back_symptoms.laterality } })}
                  />
                  <DictationTextarea
                    value={data.back_symptoms.symptom_type}
                    onChange={(v) => update({ back_symptoms: { ...data.back_symptoms, symptom_type: v } })}
                    placeholder="Symptom type (pain, numbness, weakness...)"
                    rows={1}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Leg symptoms</label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={data.leg_symptoms.specified} onChange={(e) => update({ leg_symptoms: { ...data.leg_symptoms, specified: e.target.checked } })} className="rounded text-blue-600" />
                <span className="text-sm">Specified</span>
              </label>
              {data.leg_symptoms.specified && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select
                    options={LATERALITY_OPTIONS}
                    value={data.leg_symptoms.laterality}
                    onChange={(e) => update({ leg_symptoms: { ...data.leg_symptoms, laterality: e.target.value as typeof data.leg_symptoms.laterality } })}
                  />
                  <DictationTextarea
                    value={data.leg_symptoms.symptom_type}
                    onChange={(v) => update({ leg_symptoms: { ...data.leg_symptoms, symptom_type: v } })}
                    placeholder="Symptom type"
                    rows={1}
                  />
                </div>
              )}
            </div>

            {showProportionality && (
              <Select
                label="Back/leg proportionality"
                options={PROPORTIONALITY_OPTIONS}
                value={data.back_leg_proportionality}
                onChange={(e) => update({ back_leg_proportionality: e.target.value as ClinicalData['section2']['back_leg_proportionality'] })}
              />
            )}

            {/* Character: pain intensity, frequency, modifying factors */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Character</h4>
              {hasPain && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pain intensity (1–10)</label>
                    <Select
                      options={[{ value: '', label: 'Select...' }, ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))]}
                      value={data.pain_intensity}
                      onChange={(e) => update({ pain_intensity: e.target.value })}
                    />
                  </div>
                  <Select label="Pain frequency" options={PAIN_FREQUENCY_OPTIONS} value={data.pain_frequency} onChange={(e) => update({ pain_frequency: e.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModifyingField label="Aggravating factors" value={data.aggravating_factors} onChange={(v) => update({ aggravating_factors: v })} />
                <ModifyingField label="Alleviating factors" value={data.alleviating_factors} onChange={(v) => update({ alleviating_factors: v })} />
              </div>
              <DictationTextarea
                label="Reported or observed debility"
                value={data.reported_observed_debility}
                onChange={(v) => update({ reported_observed_debility: v })}
                placeholder="Describe..."
                rows={2}
              />
            </div>
          </div>
        )}
      </section>

      {/* 2c–f */}
      <section className="space-y-4">
        <DictationTextarea label="2c. Dependency issues" value={data.dependency_issues} onChange={(v) => update({ dependency_issues: v })} placeholder="Describe..." rows={2} />
        <DictationTextarea label="2d. Psychological factors" value={data.psychological_factors} onChange={(v) => update({ psychological_factors: v })} placeholder="Describe..." rows={2} />
        <DictationTextarea label="2e. Relevant social factors" value={data.relevant_social_factors} onChange={(v) => update({ relevant_social_factors: v })} placeholder="Describe..." rows={2} />
      </section>

      {/* 2f Conservative care */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">2f. Conservative care (if applicable)</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.conservative_care_applicable} onChange={(e) => update({ conservative_care_applicable: e.target.checked })} className="rounded text-blue-600" />
          <span className="text-sm">Conservative care tried</span>
        </label>
        {data.conservative_care_applicable && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
            <Input label="Duration" value={data.conservative_duration} onChange={(e) => update({ conservative_duration: e.target.value })} placeholder="e.g. 3 months" />
            <Select label="Degree of improvement" options={DEGREE_OF_IMPROVEMENT_OPTIONS} value={data.conservative_degree_of_improvement} onChange={(e) => update({ conservative_degree_of_improvement: e.target.value })} />
            <div className="md:col-span-2 space-y-2">
              <span className="block text-sm font-medium text-slate-700">Type</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={data.conservative_type_medical} onChange={(e) => update({ conservative_type_medical: e.target.checked })} className="rounded text-blue-600" />
                  <span className="text-sm">Medical</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={data.conservative_type_other} onChange={(e) => update({ conservative_type_other: e.target.checked })} className="rounded text-blue-600" />
                  <span className="text-sm">Other</span>
                </label>
              </div>
              {data.conservative_type_other && (
                <DictationTextarea value={data.conservative_type_other_desc} onChange={(v) => update({ conservative_type_other_desc: v })} placeholder="Describe other..." rows={2} />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ModifyingField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {MODIFYING_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => (o.value === 'Custom' ? onChange(value !== 'None' && value !== 'Not reported' ? value : '') : onChange(o.value))}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              (o.value !== 'Custom' && value === o.value) || (o.value === 'Custom' && value !== 'None' && value !== 'Not reported')
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value !== 'None' && value !== 'Not reported' && (
        <DictationTextarea value={value} onChange={onChange} placeholder="Describe..." rows={2} />
      )}
    </div>
  );
}

// --- Step 3: Physical Exam ---
function Step3({
  data,
  errors,
  update,
}: {
  data: ClinicalData['section3'];
  errors: Record<string, string>;
  update: (p: Partial<ClinicalData['section3']>) => void;
}) {
  const abnormal = data.neuro_findings_mode === 'abnormal';
  return (
    <div className="space-y-8">
      <h2 className="text-subheading text-slate-900">3) Physical Exam</h2>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={data.neuro_findings_mode === 'normal'} onChange={() => update({ neuro_findings_mode: 'normal' })} className="text-blue-600" />
          <span className="text-sm">No abnormal neuro exam findings</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={abnormal} onChange={() => update({ neuro_findings_mode: 'abnormal' })} className="text-blue-600" />
          <span className="text-sm">Abnormal neuro exam findings as follows:</span>
        </label>
      </div>
      {abnormal && (
        <div className="space-y-4 pl-4 border-l-2 border-slate-200">
          <Select label="Motor (grade)" options={MOTOR_GRADE_OPTIONS} value={data.motor_grade} onChange={(e) => update({ motor_grade: e.target.value })} />
          <DictationTextarea label="Sensory" value={data.sensory} onChange={(v) => update({ sensory: v })} placeholder="Describe..." rows={2} />
          <DictationTextarea label="Gait" value={data.gait} onChange={(v) => update({ gait: v })} placeholder="Describe..." rows={2} />
          <DictationTextarea label="Reflex" value={data.reflex} onChange={(v) => update({ reflex: v })} placeholder="Describe..." rows={2} />
          <DictationTextarea label="Sphincter" value={data.sphincter} onChange={(v) => update({ sphincter: v })} placeholder="Describe..." rows={2} />
          <DictationTextarea label="Provocative tests" value={data.provocative_tests} onChange={(v) => update({ provocative_tests: v })} placeholder="Describe..." rows={2} />
        </div>
      )}
      <Select label="Observed disability (grade)" options={OBSERVED_DISABILITY_GRADE_OPTIONS} value={data.observed_disability_grade} onChange={(e) => update({ observed_disability_grade: e.target.value })} />
    </div>
  );
}

// --- Step 4: Previous surgery ---
function Step4({
  data,
  errors,
  update,
}: {
  data: ClinicalData['section4'];
  errors: Record<string, string>;
  update: (p: Partial<ClinicalData['section4']>) => void;
}) {
  return (
    <div className="space-y-8">
      <h2 className="text-subheading text-slate-900">4) Previous surgery (if applicable)</h2>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.applicable} onChange={(e) => update({ applicable: e.target.checked })} className="rounded text-blue-600" />
        <span className="text-sm">Prior spine surgery</span>
      </label>
      {data.applicable && (
        <div className="space-y-4 pl-4">
          <DictationTextarea label="Level(s) and procedure" value={data.levels_and_procedure} onChange={(v) => update({ levels_and_procedure: v })} placeholder="e.g. L4-L5 laminectomy" rows={3} />
          <Select label="Level of improvement" options={PRIOR_SURGERY_IMPROVEMENT_OPTIONS} value={data.level_of_improvement} onChange={(e) => update({ level_of_improvement: e.target.value })} />
          <DictationTextarea label="Primary reason for revision surgery" value={data.primary_reason_for_revision} onChange={(v) => update({ primary_reason_for_revision: v })} placeholder="Describe..." rows={3} />
        </div>
      )}
    </div>
  );
}

// --- Step 5: Diagnostic & Structural ---
function Step5({
  section5,
  section6,
  diagnosis_codes,
  errors,
  updateSection5,
  updateSection6,
  updateDiagnosisCodes,
}: {
  section5: ClinicalData['section5'];
  section6: ClinicalData['section6'];
  diagnosis_codes: string[];
  errors: Record<string, string>;
  updateSection5: (p: Partial<ClinicalData['section5']>) => void;
  updateSection6: (p: Partial<ClinicalData['section6']>) => void;
  updateDiagnosisCodes: (v: string[]) => void;
}) {
  const [diagInput, setDiagInput] = useState('');
  const addCode = (code: string) => {
    const t = code.trim().toUpperCase();
    if (t && !diagnosis_codes.includes(t)) updateDiagnosisCodes([...diagnosis_codes, t]);
  };
  const removeCode = (i: number) => updateDiagnosisCodes(diagnosis_codes.filter((_, j) => j !== i));

  const addSegment = () => updateSection6({ segments: [...section6.segments, { level: '', neural_compression: 'none', neural_central: false, neural_lateral: false, spondylosis: 'none', spondylosis_disc: false, spondylosis_alignment: false, other_degenerative: '' }] });
  const updateSeg = (i: number, p: Partial<SpineSegmentPathology>) => {
    const s = [...section6.segments];
    s[i] = { ...s[i], ...p };
    updateSection6({ segments: s });
  };
  const removeSeg = (i: number) => updateSection6({ segments: section6.segments.filter((_, j) => j !== i) });

  return (
    <div className="space-y-10">
      <h2 className="text-subheading text-slate-900">5) Diagnostic (pathology driving decision making)</h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Diagnosis codes (ICD-10)</label>
        <div className="flex flex-wrap gap-2">
          {diagnosis_codes.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-mono">
              {c}
              <button type="button" onClick={() => removeCode(i)} className="text-slate-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={diagInput}
            onChange={(e) => setDiagInput(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Add ICD-10 code, press Enter"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCode(diagInput); setDiagInput(''); } }}
          />
          <Button variant="secondary" onClick={() => { addCode(diagInput); setDiagInput(''); }}>Add</Button>
        </div>
        {errors.diagnosis_codes && <p className="text-sm text-red-600">{errors.diagnosis_codes}</p>}
      </div>
      <DictationTextarea label="Pathology driving decision making" value={section5.pathology_driving_decision} onChange={(v) => updateSection5({ pathology_driving_decision: v })} placeholder="Narrative..." rows={4} />

      <h2 className="text-subheading text-slate-900">6) Primary structural pathology</h2>
      <p className="text-caption text-slate-600">For each involved spine segment:</p>
      {section6.segments.map((seg, i) => (
        <div key={i} className="p-4 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Input className="flex-1" placeholder="Level (e.g. L4-L5)" value={seg.level} onChange={(e) => updateSeg(i, { level: e.target.value })} />
            <Button variant="secondary" onClick={() => removeSeg(i)}>Remove</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1">Neural compression</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1"><input type="radio" checked={seg.neural_compression === 'none'} onChange={() => updateSeg(i, { neural_compression: 'none' })} /> None</label>
                <label className="flex items-center gap-1"><input type="radio" checked={seg.neural_compression === 'present'} onChange={() => updateSeg(i, { neural_compression: 'present' })} /> Present</label>
              </div>
              {seg.neural_compression === 'present' && (
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={seg.neural_central} onChange={(e) => updateSeg(i, { neural_central: e.target.checked })} /> Central</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={seg.neural_lateral} onChange={(e) => updateSeg(i, { neural_lateral: e.target.checked })} /> Lateral</label>
                </div>
              )}
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1">Other spondylosis</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1"><input type="radio" checked={seg.spondylosis === 'none'} onChange={() => updateSeg(i, { spondylosis: 'none' })} /> None</label>
                <label className="flex items-center gap-1"><input type="radio" checked={seg.spondylosis === 'present'} onChange={() => updateSeg(i, { spondylosis: 'present' })} /> Present</label>
              </div>
              {seg.spondylosis === 'present' && (
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={seg.spondylosis_disc} onChange={(e) => updateSeg(i, { spondylosis_disc: e.target.checked })} /> Disc</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={seg.spondylosis_alignment} onChange={(e) => updateSeg(i, { spondylosis_alignment: e.target.checked })} /> Vertebral alignment</label>
                </div>
              )}
            </div>
          </div>
          <DictationTextarea value={seg.other_degenerative} onChange={(v) => updateSeg(i, { other_degenerative: v })} placeholder="Other relevant degenerative changes" rows={2} />
        </div>
      ))}
      <Button variant="secondary" onClick={addSegment}>+ Add segment</Button>

      <div className="space-y-3">
        <DictationTextarea label="(If revision) Structural changes related to previous surgery" value={section6.structural_changes_prior_surgery} onChange={(v) => updateSection6({ structural_changes_prior_surgery: v })} placeholder="Describe..." rows={2} />
        <DictationTextarea label="Diffuse degenerative changes at levels adjacent to planned surgical field" value={section6.diffuse_adjacent_levels} onChange={(v) => updateSection6({ diffuse_adjacent_levels: v })} placeholder="Describe..." rows={2} />
      </div>
    </div>
  );
}

// --- Step 6: Correlative, Arthrosis, Other ---
function Step6({
  s7,
  s8,
  s9,
  errors,
  update7,
  update8,
  update9,
}: {
  s7: ClinicalData['section7'];
  s8: ClinicalData['section8'];
  s9: ClinicalData['section9'];
  errors: Record<string, string>;
  update7: (p: Partial<ClinicalData['section7']>) => void;
  update8: (p: Partial<ClinicalData['section8']>) => void;
  update9: (p: Partial<ClinicalData['section9']>) => void;
}) {
  return (
    <div className="space-y-10">
      <h2 className="text-subheading text-slate-900">7) Correlative tests</h2>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={s7.mode === 'none'} onChange={() => update7({ mode: 'none' })} className="text-blue-600" />
          <span className="text-sm">No relevant correlative tests</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={s7.mode === 'present'} onChange={() => update7({ mode: 'present' })} className="text-blue-600" />
          <span className="text-sm">Relevant tests as follows</span>
        </label>
      </div>
      {s7.mode === 'present' && (
        <div className="space-y-4 pl-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s7.emg_positive} onChange={(e) => update7({ emg_positive: e.target.checked })} className="rounded text-blue-600" />
            <span className="text-sm">EMG positive in appropriate distributions</span>
          </label>
          {s7.emg_positive && <DictationTextarea label="EMG distributions" value={s7.emg_distributions} onChange={(v) => update7({ emg_distributions: v })} placeholder="Describe..." rows={2} />}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s7.nerve_root_blocks} onChange={(e) => update7({ nerve_root_blocks: e.target.checked })} className="rounded text-blue-600" />
            <span className="text-sm">Correlative nerve root blocks</span>
          </label>
          {s7.nerve_root_blocks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Percent improvement" value={s7.nerve_root_blocks_percent_improvement} onChange={(e) => update7({ nerve_root_blocks_percent_improvement: e.target.value })} placeholder="e.g. 80" />
              <Input label="Duration" value={s7.nerve_root_blocks_duration} onChange={(e) => update7({ nerve_root_blocks_duration: e.target.value })} placeholder="e.g. 2 weeks" />
            </div>
          )}
          <DictationTextarea label="Other" value={s7.other} onChange={(v) => update7({ other: v })} placeholder="Other correlative tests..." rows={2} />
        </div>
      )}

      <h2 className="text-subheading text-slate-900">8) Other major symptomatic joint arthrosis (if applicable)</h2>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={s8.applicable} onChange={(e) => update8({ applicable: e.target.checked })} className="rounded text-blue-600" />
        <span className="text-sm">Applicable</span>
      </label>
      {s8.applicable && <DictationTextarea value={s8.description} onChange={(v) => update8({ description: v })} placeholder="Describe..." rows={3} />}

      <DictationTextarea label="9) Other relevant patient-related information" value={s9.information} onChange={(v) => update9({ information: v })} placeholder="Describe..." rows={4} />
    </div>
  );
}

// --- Step 7: Procedure & Images ---
function Step7({
  s10,
  s11,
  errors,
  update10,
  update11,
}: {
  s10: ClinicalData['section10'];
  s11: ClinicalData['section11'];
  errors: Record<string, string>;
  update10: (p: Partial<ClinicalData['section10']>) => void;
  update11: (p: Partial<ClinicalData['section11']>) => void;
}) {
  const addSeg = () => update10({ segments: [...s10.segments, { level: '', direct_decompression: false, indirect_decompression: false, fusion: false }] });
  const updateSeg = (i: number, p: Partial<SegmentProcedure>) => {
    const s = [...s10.segments];
    s[i] = { ...s[i], ...p };
    update10({ segments: s });
  };
  const removeSeg = (i: number) => update10({ segments: s10.segments.filter((_, j) => j !== i) });

  return (
    <div className="space-y-10">
      <h2 className="text-subheading text-slate-900">10) Procedure (discussion)</h2>
      <Select label="Primary approach" options={PRIMARY_APPROACH_OPTIONS} value={s10.primary_approach} onChange={(e) => update10({ primary_approach: e.target.value })} />
      {s10.primary_approach === 'OTHER' && <DictationTextarea label="Primary approach (other)" value={s10.primary_approach_other} onChange={(v) => update10({ primary_approach_other: v })} placeholder="Describe..." rows={2} />}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">For each segment or vertebral level</h3>
        {s10.segments.map((seg, i) => (
          <div key={i} className="p-3 border border-slate-200 rounded-lg flex flex-wrap items-center gap-3 mb-2">
            <Input className="w-28" placeholder="Level" value={seg.level} onChange={(e) => updateSeg(i, { level: e.target.value })} />
            <label className="flex items-center gap-1"><input type="checkbox" checked={seg.direct_decompression} onChange={(e) => updateSeg(i, { direct_decompression: e.target.checked })} /> Direct decompression</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={seg.indirect_decompression} onChange={(e) => updateSeg(i, { indirect_decompression: e.target.checked })} /> Indirect decompression</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={seg.fusion} onChange={(e) => updateSeg(i, { fusion: e.target.checked })} /> Fusion</label>
            <Button variant="secondary" onClick={() => removeSeg(i)}>Remove</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={addSeg}>+ Add segment</Button>
      </div>

      <DictationTextarea label="11) Images (discussion)" value={s11.discussion} onChange={(v) => update11({ discussion: v })} placeholder="Describe imaging findings and relevance..." rows={5} />
    </div>
  );
}

// --- Step 8: Justification, Comments, CPT ---
function Step8({
  s12,
  s13,
  s14,
  proposed_procedure_codes,
  errors,
  update12,
  update13,
  update14,
  updateCPT,
}: {
  s12: ClinicalData['section12'];
  s13: ClinicalData['section13'];
  s14: ClinicalData['section14'];
  proposed_procedure_codes: string[];
  errors: Record<string, string>;
  update12: (p: Partial<ClinicalData['section12']>) => void;
  update13: (p: Partial<ClinicalData['section13']>) => void;
  update14: (p: Partial<ClinicalData['section14']>) => void;
  updateCPT: (v: string[]) => void;
}) {
  const [cptInput, setCptInput] = useState('');
  const addCPT = (code: string) => {
    const t = code.trim().toUpperCase();
    if (t && !proposed_procedure_codes.includes(t)) updateCPT([...proposed_procedure_codes, t]);
  };
  const removeCPT = (i: number) => updateCPT(proposed_procedure_codes.filter((_, j) => j !== i));

  return (
    <div className="space-y-10">
      <DictationTextarea label="12) Surgical justification" value={s12.justification} onChange={(v) => update12({ justification: v })} placeholder="Clinical rationale for the proposed surgical intervention..." rows={6} error={errors.justification} />
      <DictationTextarea label="13) Other relevant comments (if applicable)" value={s13.comments} onChange={(v) => update13({ comments: v })} placeholder="Any other comments..." rows={4} />

      <h2 className="text-subheading text-slate-900">14) CPT (discuss)</h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Proposed procedure codes (CPT)</label>
        <div className="flex flex-wrap gap-2">
          {proposed_procedure_codes.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-mono">
              {c}
              <button type="button" onClick={() => removeCPT(i)} className="text-blue-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={cptInput}
            onChange={(e) => setCptInput(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Add CPT code, press Enter"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCPT(cptInput); setCptInput(''); } }}
          />
          <Button variant="secondary" onClick={() => { addCPT(cptInput); setCptInput(''); }}>Add</Button>
        </div>
        {errors.proposed_procedure_codes && <p className="text-sm text-red-600">{errors.proposed_procedure_codes}</p>}
      </div>
      <DictationTextarea label="CPT discussion" value={s14.discussion} onChange={(v) => update14({ discussion: v })} placeholder="Discussion of procedure codes..." rows={3} />
    </div>
  );
}

// --- Step 9: Imaging Upload ---
function Step9({
  imaging_paths,
  handleFileUpload,
  removeFile,
  uploadProgress,
}: {
  imaging_paths: string[];
  handleFileUpload: (f: FileList) => void;
  removeFile: (i: number) => void;
  uploadProgress: Record<string, number>;
}) {
  const [drag, setDrag] = useState(false);
  const getName = (p: string) => p.split('/').pop() ?? p;

  return (
    <div className="space-y-8">
      <h2 className="text-subheading text-slate-900">Imaging Upload</h2>
      <p className="text-caption text-slate-600">Upload relevant imaging files (MRI, CT, X-ray, DICOM, etc.)</p>
      <div
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        className={clsx('relative border-2 border-dashed rounded-xl p-8 text-center transition-colors', drag ? 'border-blue-500 bg-blue-50' : 'border-slate-300')}
      >
        <input type="file" multiple accept="image/*,.pdf,.dcm,.zip" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p className="font-medium text-slate-700">Drop files here or click to upload</p>
          <p className="text-sm text-slate-500">JPEG, PNG, PDF, DICOM, ZIP</p>
        </div>
      </div>
      {imaging_paths.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Uploaded ({imaging_paths.length})</h3>
          {imaging_paths.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <span className="text-sm font-medium">{getName(p)}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">Remove</button>
            </div>
          ))}
        </div>
      )}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">Imaging is optional. You may save as draft and upload later.</div>
    </div>
  );
}
