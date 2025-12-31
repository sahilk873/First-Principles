'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CompleteInviteFormProps {
  token: string;
  email: string;
  flowType: 'invite' | 'signup';
}

export function CompleteInviteForm({ token, email, flowType }: CompleteInviteFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verified, setVerified] = useState(flowType === 'invite' && !token ? true : false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!verified) {
        if (flowType === 'signup') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'signup',
          });
          if (verifyError) {
            setError(verifyError.message);
            setIsSubmitting(false);
            return;
          }
          setVerified(true);
        } else {
          if (token) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'invite',
            });
            if (verifyError) {
              setError(verifyError.message);
              setIsSubmitting(false);
              return;
            }
          } else {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              setError('This invite has expired. Please request a new invitation.');
              setIsSubmitting(false);
              return;
            }
          }
          setVerified(true);
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setIsSubmitting(false);
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);
    } catch (error) {
      console.error('Error completing invite:', error);
      setError('Something went wrong while completing your setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (flowType === 'signup' && (!token || !email)) {
    return (
      <div className="space-y-4 text-center text-sm text-rose-600">
        This invite link is invalid or has expired. Please request a new invitation.
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-green-600 font-semibold">Password set successfully!</div>
        <p className="text-sm text-slate-600">
          You can now sign in using your new password.
        </p>
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {email && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <Input value={email} readOnly disabled />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a strong password"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
          disabled={isSubmitting}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Set Password
      </Button>
    </form>
  );
}
