'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { revokeInviteAction } from '@/app/actions/collaborator-actions';
import { Loader2, X } from 'lucide-react';

interface CollaboratorActionsProps {
  id: string;
  type: 'collaborator' | 'invite';
}

export function CollaboratorActions({ id, type }: CollaboratorActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      await revokeInviteAction(id);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-600"
      onClick={handleRevoke}
      disabled={isPending}
      title={type === 'invite' ? 'Revoke invite' : 'Remove collaborator'}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
