'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function TransactionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Transaction detail error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <ErrorState
        title="Failed to load transaction"
        message="We couldn't load the transaction details. It may have been deleted or you may not have access."
        onRetry={reset}
      />
    </div>
  );
}
