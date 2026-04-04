'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cancelDocumentRequestAction } from '@/app/actions/document-request-actions';
import { Loader2, X } from 'lucide-react';

interface CancelRequestButtonProps {
  requestId: string;
}

export function CancelRequestButton({ requestId }: CancelRequestButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      await cancelDocumentRequestAction(requestId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-3 rounded-lg text-muted-foreground hover:text-red-600 shrink-0"
      onClick={handleCancel}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </>
      )}
    </Button>
  );
}
