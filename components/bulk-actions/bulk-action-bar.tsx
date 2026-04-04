'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBulkActionAction } from '@/app/actions/bulk-action-actions';
import { useToast } from '@/hooks/use-toast';
import { X, ChevronDown, UserPlus, CheckSquare, Bell, Archive, GitBranch, ThumbsUp } from 'lucide-react';
import type { BulkActionType } from '@/types';

interface BulkActionBarProps {
  selectedIds: string[];
  entityType: string;
  onClear: () => void;
  allowedActions?: BulkActionType[];
}

const actionConfig: Record<BulkActionType, { label: string; icon: typeof UserPlus }> = {
  assign_owner: { label: 'Assign Owner', icon: UserPlus },
  assign_reviewer: { label: 'Assign Reviewer', icon: UserPlus },
  request_review: { label: 'Request Review', icon: CheckSquare },
  mark_reviewed: { label: 'Mark Reviewed', icon: CheckSquare },
  send_reminder: { label: 'Send Reminder', icon: Bell },
  archive: { label: 'Archive', icon: Archive },
  change_stage: { label: 'Change Stage', icon: GitBranch },
  bulk_approve: { label: 'Approve All', icon: ThumbsUp },
};

const defaultActions: BulkActionType[] = [
  'assign_owner',
  'request_review',
  'mark_reviewed',
  'send_reminder',
  'archive',
];

export function BulkActionBar({
  selectedIds,
  entityType,
  onClear,
  allowedActions = defaultActions,
}: BulkActionBarProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (selectedIds.length === 0) return null;

  async function handleAction(actionType: BulkActionType) {
    setSubmitting(true);
    const result = await createBulkActionAction(actionType, entityType, selectedIds);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({
        title: 'Bulk action started',
        description: `Processing ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}...`,
      });
      onClear();
    }
    setSubmitting(false);
  }

  return (
    <div className="sticky bottom-4 z-40 flex items-center justify-between gap-4 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-[12px] px-2.5 py-1 font-semibold">
          {selectedIds.length} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 text-[12px] text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            disabled={submitting}
            className="text-[12px] h-8 gap-1.5"
          >
            {submitting ? 'Processing...' : 'Actions'}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {allowedActions.map((action) => {
            const config = actionConfig[action];
            if (!config) return null;
            return (
              <DropdownMenuItem
                key={action}
                onClick={() => handleAction(action)}
                className="text-[13px] gap-2"
              >
                <config.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
