'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Authenticated route error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <ErrorState
        title="Something went wrong"
        message="We encountered an unexpected error. Please try again or contact support if the problem persists."
        onRetry={reset}
      />
    </div>
  );
}
