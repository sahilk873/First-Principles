import { Card, CardHeader } from '@/components/ui/Card';
import { CompleteInviteForm } from './_components/CompleteInviteForm';

interface CompleteInvitePageProps {
  searchParams: Promise<{
    token?: string;
    token_hash?: string;
    email?: string;
    type?: string;
  }>;
}

export default async function CompleteInvitePage({ searchParams }: CompleteInvitePageProps) {
  const params = await searchParams;
  const token = params.token || params.token_hash || '';
  const email = params.email || '';
  const type = ((params.type || 'invite')).toLowerCase();

  const isInviteFlow = type === 'invite';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>Complete Your Account Setup</CardHeader>
        <div className="px-6 pb-6">
          <CompleteInviteForm token={token} email={email} flowType={isInviteFlow ? 'invite' : 'signup'} />
        </div>
      </Card>
    </div>
  );
}
