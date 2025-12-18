import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { Profile, Organization, Review, Case } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ReviewWorkspace } from './_components/ReviewWorkspace';
import { SymptomProfile, NeuroDeficits, Comorbidities, ConservativeCare } from '@/lib/actions/cases';

interface ReviewDetailPageProps {
  params: Promise<{ reviewId: string }>;
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { reviewId } = await params;
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

  // Fetch the review with related case
  const { data: reviewData, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      *,
      case:cases!case_id(
        id, 
        patient_pseudo_id, 
        anatomy_region, 
        symptom_profile, 
        neuro_deficits, 
        prior_surgery, 
        prior_surgery_details, 
        comorbidities, 
        conservative_care, 
        diagnosis_codes, 
        proposed_procedure_codes, 
        free_text_summary, 
        imaging_paths,
        org_id
      )
    `)
    .eq('id', reviewId)
    .single();

  if (reviewError || !reviewData) {
    return (
      <AppLayout user={{ profile, organization }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Review Not Found</h1>
          <p className="mt-2 text-slate-600">The review you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/reviews" className="mt-4">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const review = reviewData as Review & {
    case?: Case | null;
  };

  // Access control
  const isReviewer = review.reviewer_id === profile.id;
  const isOrgAdmin = profile.role === 'ORG_ADMIN' && review.case?.org_id === profile.org_id;
  const isSysAdmin = profile.role === 'SYS_ADMIN';

  const canView = isReviewer || isOrgAdmin || isSysAdmin;
  const canEdit = isReviewer && profile.role === 'EXPERT_REVIEWER' && review.status !== 'SUBMITTED';

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
          <p className="mt-2 text-slate-600">You don&apos;t have permission to view this review.</p>
          <Link href="/reviews" className="mt-4">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Parse case JSON fields
  const caseData = review.case;
  const symptomProfile = (caseData?.symptom_profile || {}) as unknown as SymptomProfile;
  const neuroDeficits = (caseData?.neuro_deficits || {}) as unknown as NeuroDeficits;
  const comorbidities = (caseData?.comorbidities || {}) as unknown as Comorbidities;
  const conservativeCare = (caseData?.conservative_care || {}) as unknown as ConservativeCare;
  const diagnosisCodes = (caseData?.diagnosis_codes || []) as unknown as string[];
  const procedureCodes = (caseData?.proposed_procedure_codes || []) as unknown as string[];
  const imagingPaths = (caseData?.imaging_paths || []) as unknown as string[];

  return (
    <AppLayout user={{ profile, organization }}>
      <ReviewWorkspace
        review={review}
        caseData={{
          id: caseData?.id || '',
          patient_pseudo_id: caseData?.patient_pseudo_id || '',
          anatomy_region: caseData?.anatomy_region || '',
          symptom_profile: symptomProfile,
          neuro_deficits: neuroDeficits,
          prior_surgery: caseData?.prior_surgery || false,
          prior_surgery_details: caseData?.prior_surgery_details || '',
          comorbidities,
          conservative_care: conservativeCare,
          diagnosis_codes: diagnosisCodes,
          proposed_procedure_codes: procedureCodes,
          free_text_summary: caseData?.free_text_summary || '',
          imaging_paths: imagingPaths,
        }}
        canEdit={canEdit}
        profile={profile}
      />
    </AppLayout>
  );
}

