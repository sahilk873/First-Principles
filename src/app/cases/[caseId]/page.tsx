import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Case, CaseResult, Review } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant, formatStatus } from '@/components/ui/Badge';
import { formatDate, truncateId } from '@/lib/utils/date';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SymptomProfile, NeuroDeficits, Comorbidities, ConservativeCare } from '@/lib/actions/cases';

const mergeJsonField = <T extends object>(value: unknown, defaults: T): T => {
  if (value && typeof value === 'object') {
    return { ...defaults, ...(value as Partial<T>) };
  }
  return defaults;
};

interface CaseDetailPageProps {
  params: Promise<{ caseId: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = profileData as Profile | null;

  if (profileError || !profile) {
    redirect('/login');
  }

  // Fetch the organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  const organization = orgData as Organization | null;

  if (orgError || !organization) {
    redirect('/login');
  }

  // Fetch the case with related data
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select(`
      *,
      submitter:profiles!submitter_id(id, name, email),
      organization:organizations!org_id(name)
    `)
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Case Not Found</h1>
          <p className="mt-2 text-slate-600">
            The case you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link href="/cases" className="mt-4">
            <Button variant="secondary">Back to Cases</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const caseItem = caseData as Case & {
    submitter?: { id: string; name: string; email: string } | null;
    organization?: { name: string } | null;
  };

  // Access control check
  const canView = 
    profile.role === 'SYS_ADMIN' ||
    (profile.role === 'ORG_ADMIN' && caseItem.org_id === profile.org_id) ||
    (profile.role === 'CLINICIAN' && caseItem.submitter_id === profile.id) ||
    profile.role === 'EXPERT_REVIEWER'; // Will check review assignment below

  // For expert reviewers, check if they're assigned to this case
  if (profile.role === 'EXPERT_REVIEWER') {
    const { data: reviewCheck } = await supabase
      .from('reviews')
      .select('id')
      .eq('case_id', caseId)
      .eq('reviewer_id', profile.id)
      .single();
    
    if (!reviewCheck && caseItem.submitter_id !== profile.id) {
      return (
        <AppLayout user={{ profile, organization }}>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
            <p className="mt-2 text-slate-600">You don&apos;t have permission to view this case.</p>
            <Link href="/reviews" className="mt-4">
              <Button variant="secondary">Go to Reviews</Button>
            </Link>
          </div>
        </AppLayout>
      );
    }
  }

  if (!canView) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-600">You don&apos;t have permission to view this case.</p>
          <Link href="/cases" className="mt-4">
            <Button variant="secondary">Back to Cases</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Fetch case result if exists
  const { data: caseResultData } = await supabase
    .from('case_results')
    .select('*')
    .eq('case_id', caseId)
    .single();
  const caseResult = caseResultData as CaseResult | null;

  // Parse JSON fields with sane defaults to satisfy strict typing
  const symptomProfile = mergeJsonField<SymptomProfile>(caseItem.symptom_profile, {
    summary: '',
    duration: '',
    leg_vs_back: undefined,
    severity: undefined,
  });
  const neuroDeficits = mergeJsonField<NeuroDeficits>(caseItem.neuro_deficits, {
    motor_weakness: false,
    sensory_loss: false,
    gait_instability: false,
    bowel_bladder: false,
  });
  const comorbidities = mergeJsonField<Comorbidities>(caseItem.comorbidities, {
    diabetes: false,
    smoker: false,
    obesity: false,
    heart_disease: false,
    osteoporosis: false,
    other: '',
  });
  const conservativeCare = mergeJsonField<ConservativeCare>(caseItem.conservative_care, {
    pt_tried: false,
    meds: false,
    injections: false,
    duration: '',
  });
  const diagnosisCodes = (caseItem.diagnosis_codes || []) as string[];
  const procedureCodes = (caseItem.proposed_procedure_codes || []) as string[];
  const imagingPaths = (caseItem.imaging_paths || []) as string[];

  // Check if user can edit (draft only, by submitter)
  const canEdit = caseItem.status === 'DRAFT' && caseItem.submitter_id === profile.id;

  return (
    <AppLayout user={{ profile, organization }}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/cases"
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Case Details</h1>
              <Badge variant={getStatusBadgeVariant(caseItem.status)} size="md">
                {formatStatus(caseItem.status)}
              </Badge>
            </div>
            <p className="text-slate-600 font-mono text-sm">{caseItem.id}</p>
          </div>
          <div className="flex gap-3">
            {canEdit && (
              <Link href={`/cases/new?edit=${caseItem.id}`}>
                <Button variant="secondary">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Draft
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Result Banner (if completed) */}
        {caseResult && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  caseResult.final_class === 'APPROPRIATE' ? 'bg-green-100 text-green-600' :
                  caseResult.final_class === 'UNCERTAIN' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {caseResult.final_class === 'APPROPRIATE' ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : caseResult.final_class === 'UNCERTAIN' ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Appropriateness Result</p>
                  <p className="text-xl font-bold text-slate-900">{caseResult.final_class}</p>
                  <p className="text-sm text-slate-500">Mean Score: {caseResult.mean_score?.toFixed(1)} / 9</p>
                </div>
              </div>
              <Link href={`/cases/${caseId}/result`}>
                <Button>
                  View Full Result
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>Overview</CardHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Patient ID</p>
                  <p className="font-medium">{caseItem.patient_pseudo_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Anatomy Region</p>
                  <p className="font-medium">{caseItem.anatomy_region}</p>
                </div>
              </div>
              {symptomProfile.summary && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Symptom Summary</p>
                  <p className="font-medium text-slate-700">{symptomProfile.summary}</p>
                </div>
              )}
            </Card>

            {/* Clinical Data */}
            <Card>
              <CardHeader>Clinical Data</CardHeader>
              
              {/* Symptom Profile */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Symptom Profile</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Duration</p>
                    <p className="font-medium">{symptomProfile.duration || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pain Distribution</p>
                    <p className="font-medium">{formatLegVsBack(symptomProfile.leg_vs_back)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Severity</p>
                    <p className="font-medium">{symptomProfile.severity ? `${symptomProfile.severity}/10` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Neurological Deficits */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Neurological Deficits</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(neuroDeficits).filter(([, value]) => value).length > 0 ? (
                    Object.entries(neuroDeficits)
                      .filter(([, value]) => value)
                      .map(([key]) => (
                        <span key={key} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                          {formatNeuroDeficit(key)}
                        </span>
                      ))
                  ) : (
                    <span className="text-slate-500 text-sm">No neurological deficits reported</span>
                  )}
                </div>
              </div>

              {/* Prior Surgery */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Prior Surgery</h4>
                {caseItem.prior_surgery ? (
                  <div>
                    <Badge variant="warning">Yes - Prior Surgery</Badge>
                    {caseItem.prior_surgery_details && (
                      <p className="mt-2 text-slate-700">{caseItem.prior_surgery_details}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500 text-sm">No prior spine surgery</span>
                )}
              </div>

              {/* Comorbidities */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Comorbidities</h4>
                <div className="flex flex-wrap gap-2">
                  {formatComorbidities(comorbidities).length > 0 ? (
                    formatComorbidities(comorbidities).map((item, index) => (
                      <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">No comorbidities reported</span>
                  )}
                </div>
              </div>

              {/* Conservative Care */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Conservative Care Tried</h4>
                <div className="flex flex-wrap gap-2">
                  {formatConservativeCare(conservativeCare).length > 0 ? (
                    formatConservativeCare(conservativeCare).map((item, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">No conservative care reported</span>
                  )}
                </div>
                {conservativeCare.duration && (
                  <p className="text-sm text-slate-600">Duration: {conservativeCare.duration}</p>
                )}
              </div>
            </Card>

            {/* Proposed Procedure */}
            <Card>
              <CardHeader>Proposed Procedure</CardHeader>
              
              {/* Diagnosis Codes */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Diagnosis Codes</h4>
                {diagnosisCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {diagnosisCodes.map((code, index) => (
                      <span key={index} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 text-sm">No diagnosis codes</span>
                )}
              </div>

              {/* Procedure Codes */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Procedure Codes</h4>
                {procedureCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {procedureCodes.map((code, index) => (
                      <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 text-sm">No procedure codes</span>
                )}
              </div>

              {/* Clinical Rationale */}
              {caseItem.free_text_summary && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Clinical Rationale</h4>
                  <p className="text-slate-700 whitespace-pre-wrap">{caseItem.free_text_summary}</p>
                </div>
              )}
            </Card>

            {/* Imaging */}
            <Card>
              <CardHeader>Imaging</CardHeader>
              {imagingPaths.length > 0 ? (
                <div className="space-y-3">
                  {imagingPaths.map((path, index) => {
                    const fileName = path.split('/').pop() || path;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700">{fileName}</span>
                        </div>
                        <ImagingDownloadButton path={path} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No imaging files uploaded</p>
                </div>
              )}
            </Card>

            {/* Result Placeholder */}
            {!caseResult && caseItem.status !== 'DRAFT' && (
              <Card>
                <CardHeader>Result</CardHeader>
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium">Result Pending</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {caseItem.status === 'UNDER_REVIEW' 
                      ? 'Expert reviewers are evaluating this case'
                      : 'Case is awaiting review assignment'}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>Case Information</CardHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Case ID</p>
                  <p className="font-mono text-sm">{truncateId(caseItem.id)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge variant={getStatusBadgeVariant(caseItem.status)}>
                    {formatStatus(caseItem.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitter</p>
                  <p className="font-medium">{caseItem.submitter?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">{caseItem.submitter?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Organization</p>
                  <p className="font-medium">{caseItem.organization?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium">{formatDate(caseItem.created_at)}</p>
                </div>
                {caseItem.submitted_at && (
                  <div>
                    <p className="text-sm text-slate-500">Submitted</p>
                    <p className="font-medium">{formatDate(caseItem.submitted_at)}</p>
                  </div>
                )}
                {caseItem.completed_at && (
                  <div>
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="font-medium">{formatDate(caseItem.completed_at)}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            {canEdit && (
              <Card>
                <CardHeader>Quick Actions</CardHeader>
                <div className="space-y-2">
                  <Link href={`/cases/new?edit=${caseItem.id}`} className="block">
                    <Button variant="secondary" fullWidth>
                      Edit Draft
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper function to format leg_vs_back
function formatLegVsBack(value?: string): string {
  switch (value) {
    case 'leg_dominant':
      return 'Leg Dominant';
    case 'back_dominant':
      return 'Back Dominant';
    case 'equal':
      return 'Equal';
    default:
      return '—';
  }
}

// Helper function to format neuro deficit key
function formatNeuroDeficit(key: string): string {
  switch (key) {
    case 'motor_weakness':
      return 'Motor Weakness';
    case 'sensory_loss':
      return 'Sensory Loss';
    case 'gait_instability':
      return 'Gait Instability';
    case 'bowel_bladder':
      return 'Bowel/Bladder Dysfunction';
    default:
      return key.replace(/_/g, ' ');
  }
}

// Helper function to format comorbidities
function formatComorbidities(comorbidities: Comorbidities): string[] {
  const items: string[] = [];
  if (comorbidities.diabetes) items.push('Diabetes');
  if (comorbidities.smoker) items.push('Smoker');
  if (comorbidities.obesity) items.push('Obesity');
  if (comorbidities.heart_disease) items.push('Heart Disease');
  if (comorbidities.osteoporosis) items.push('Osteoporosis');
  if (comorbidities.other) items.push(comorbidities.other);
  return items;
}

// Helper function to format conservative care
function formatConservativeCare(care: ConservativeCare): string[] {
  const items: string[] = [];
  if (care.pt_tried) items.push('Physical Therapy');
  if (care.meds) items.push('Medications');
  if (care.injections) items.push('Injections');
  return items;
}

// Client component for download button
function ImagingDownloadButton({ path }: { path: string }) {
  return (
    <a
      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imaging/${path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download
    </a>
  );
}
