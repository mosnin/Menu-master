'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { acceptInviteAction } from '@/app/actions/onboarding-actions';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      await acceptInviteAction(token);
      setAccepted(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="mt-8 space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
          <Check className="h-5 w-5 text-green-600" />
        </div>
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Invite accepted! Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button
        className="w-full rounded-xl"
        onClick={handleAccept}
        disabled={submitting}
      >
        {submitting ? 'Accepting...' : 'Accept Invite'}
      </Button>
    </div>
  );
}
