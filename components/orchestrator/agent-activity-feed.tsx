'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Check,
  X,
  Clock,
  Shield,
  Zap,
  FileEdit,
  Ban,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrchestratorActionExecution, ActionRiskClass, ActionDisposition } from '@/types';

interface AgentActivityFeedProps {
  executions: OrchestratorActionExecution[];
}

const riskClassConfig: Record<ActionRiskClass, { label: string; className: string }> = {
  safe: { label: 'Safe', className: 'bg-green-100 text-green-700' },
  medium_risk: { label: 'Medium', className: 'bg-amber-100 text-amber-700' },
  high_risk: { label: 'High', className: 'bg-red-100 text-red-700' },
};

const dispositionBadgeConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  auto_execute: { label: 'Auto', className: 'bg-green-100 text-green-700', icon: Zap },
  create_draft: { label: 'Draft', className: 'bg-amber-100 text-amber-700', icon: FileEdit },
  create_approval: { label: 'Approval', className: 'bg-blue-100 text-blue-700', icon: Shield },
  block: { label: 'Blocked', className: 'bg-red-100 text-red-700', icon: Ban },
};

type DispositionFilter = 'all' | ActionDisposition;

const filterOptions: { value: DispositionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'auto_execute', label: 'Auto' },
  { value: 'create_draft', label: 'Drafts' },
  { value: 'create_approval', label: 'Approvals' },
  { value: 'block', label: 'Blocked' },
];

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ExecutionItem({ execution }: { execution: OrchestratorActionExecution }) {
  const riskClass = (execution.result?.risk_class as ActionRiskClass) ?? 'safe';
  const risk = riskClassConfig[riskClass] ?? riskClassConfig.safe;
  const disposition = (execution.result?.disposition as string) ?? null;
  const dispConfig = disposition ? dispositionBadgeConfig[disposition] : null;

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          'rounded-lg p-1.5 mt-0.5 shrink-0',
          execution.success ? 'bg-green-50' : 'bg-red-50',
        )}
      >
        {execution.success ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <X className="h-3.5 w-3.5 text-red-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold tracking-tight">
            {formatToolName(execution.tool_name)}
          </span>
          <Badge className={cn('text-[9px] font-medium', risk.className)}>
            <Shield className="h-2 w-2 mr-0.5" />
            {risk.label}
          </Badge>
          {dispConfig && (
            <Badge className={cn('text-[9px] font-medium', dispConfig.className)}>
              <dispConfig.icon className="h-2 w-2 mr-0.5" />
              {dispConfig.label}
            </Badge>
          )}
        </div>
        {execution.error_message && (
          <p className="text-[11px] text-red-600 mt-0.5">{execution.error_message}</p>
        )}
        {execution.side_effects && execution.side_effects.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {execution.side_effects.map((effect, idx) => (
              <li
                key={idx}
                className="text-[11px] text-muted-foreground flex items-center gap-1.5"
              >
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                {effect.description}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
          {execution.duration_ms !== null && (
            <span className="ml-1 tabular-nums">({execution.duration_ms}ms)</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function AgentActivityFeed({ executions }: AgentActivityFeedProps) {
  const [filter, setFilter] = useState<DispositionFilter>('all');

  const filtered =
    filter === 'all'
      ? executions
      : executions.filter((e) => (e.result?.disposition as string) === filter);

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Activity className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No activity yet</p>
        <p className="text-xs text-muted-foreground">
          Executed actions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Recent Executions
        </p>
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 px-2 text-[10px] rounded-lg',
                filter === opt.value
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="divide-y">
        {filtered.length > 0 ? (
          filtered.map((execution) => (
            <ExecutionItem key={execution.id} execution={execution} />
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No executions match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
