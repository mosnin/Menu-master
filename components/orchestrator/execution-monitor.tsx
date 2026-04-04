'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  Clock,
  Shield,
  FileEdit,
  Ban,
  Zap,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { getExecutionHistoryAction } from '@/app/actions/orchestrator-actions';
import type { ActionDisposition } from '@/types';

interface ExecutionEntry {
  id: string;
  tool_name: string;
  disposition: ActionDisposition;
  success: boolean;
  result_summary: string | null;
  error_message: string | null;
  draft_type: string | null;
  blocked_reason: string | null;
  blocked_unlocker: string | null;
  created_at: string;
}

interface ExecutionMonitorProps {
  orchestratorId: string;
  organizationId: string;
}

const dispositionConfig: Record<
  ActionDisposition,
  { label: string; className: string; icon: React.ElementType }
> = {
  auto_execute: {
    label: 'Auto',
    className: 'bg-green-100 text-green-700',
    icon: Zap,
  },
  create_draft: {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-700',
    icon: FileEdit,
  },
  create_approval: {
    label: 'Approval',
    className: 'bg-blue-100 text-blue-700',
    icon: Shield,
  },
  block: {
    label: 'Blocked',
    className: 'bg-red-100 text-red-700',
    icon: Ban,
  },
};

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByTime(entries: ExecutionEntry[]): { label: string; entries: ExecutionEntry[] }[] {
  const groups: Record<string, ExecutionEntry[]> = {};
  const order: string[] = [];

  for (const entry of entries) {
    const date = new Date(entry.created_at);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else if (isThisWeek(date)) {
      label = 'This Week';
    } else {
      label = 'Earlier';
    }

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(entry);
  }

  return order.map((label) => ({ label, entries: groups[label] }));
}

function ExecutionEntry({ entry }: { entry: ExecutionEntry }) {
  const config = dispositionConfig[entry.disposition] ?? dispositionConfig.auto_execute;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          'rounded-lg p-1.5 mt-0.5 shrink-0',
          entry.disposition === 'auto_execute' && entry.success && 'bg-green-50',
          entry.disposition === 'auto_execute' && !entry.success && 'bg-red-50',
          entry.disposition === 'create_draft' && 'bg-amber-50',
          entry.disposition === 'create_approval' && 'bg-blue-50',
          entry.disposition === 'block' && 'bg-red-50',
        )}
      >
        {entry.disposition === 'auto_execute' ? (
          entry.success ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <X className="h-3.5 w-3.5 text-red-600" />
          )
        ) : (
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold tracking-tight">
            {formatToolName(entry.tool_name)}
          </span>
          <Badge className={cn('text-[9px] font-medium', config.className)}>
            <Icon className="h-2 w-2 mr-0.5" />
            {config.label}
          </Badge>
        </div>

        {/* Result summary for auto-executed */}
        {entry.disposition === 'auto_execute' && entry.result_summary && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {entry.result_summary}
          </p>
        )}

        {/* Error for failed auto-executions */}
        {entry.disposition === 'auto_execute' && entry.error_message && (
          <p className="text-[11px] text-red-600 mt-0.5">{entry.error_message}</p>
        )}

        {/* Draft type for drafts */}
        {entry.disposition === 'create_draft' && entry.draft_type && (
          <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
            <FileEdit className="h-2.5 w-2.5" />
            {entry.draft_type} — waiting for review
          </p>
        )}

        {/* Blocked reason */}
        {entry.disposition === 'block' && (
          <div className="mt-0.5 space-y-0.5">
            {entry.blocked_reason && (
              <p className="text-[11px] text-red-600">{entry.blocked_reason}</p>
            )}
            {entry.blocked_unlocker && (
              <p className="text-[11px] text-muted-foreground">
                Can be unblocked by: <span className="font-medium">{entry.blocked_unlocker}</span>
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export function ExecutionMonitor({ orchestratorId, organizationId }: ExecutionMonitorProps) {
  const [entries, setEntries] = useState<ExecutionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchData = useCallback(async () => {
    try {
      const result = await getExecutionHistoryAction(orchestratorId);
      if (result.data) {
        setEntries(result.data as ExecutionEntry[]);
      }
    } catch {
      // silently fail — parent handles errors
    } finally {
      setLoading(false);
    }
  }, [orchestratorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No executions yet</p>
        <p className="text-xs text-muted-foreground">
          Autonomous actions will appear here as they run.
        </p>
      </div>
    );
  }

  const visible = entries.slice(0, visibleCount);
  const grouped = groupByTime(visible);
  const hasMore = visibleCount < entries.length;

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Execution History
      </p>

      {grouped.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mb-1">
            {group.label}
          </p>
          <div className="divide-y">
            {group.entries.map((entry) => (
              <ExecutionEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground rounded-xl"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          <ChevronDown className="h-3 w-3 mr-1.5" />
          Show more
        </Button>
      )}
    </div>
  );
}
