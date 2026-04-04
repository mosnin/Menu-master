'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Circle,
  Loader2,
  Clock,
  XCircle,
  CheckCircle2,
  Minus,
  AlertTriangle,
  Calendar,
  Hash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PlanRevisionHistory } from './plan-revision-history';
import { getActivePlanAction } from '@/app/actions/orchestrator-actions';
import type {
  OrchestratorPlan,
  OrchestratorSubgoal,
  PlanProgress,
  PlanRevision,
  PlanStatus,
  SubgoalStatus,
} from '@/types';

interface PlanOverviewProps {
  orchestratorId: string;
  organizationId: string;
}

const AUTO_REFRESH_MS = 60_000;

const planStatusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  waiting: { label: 'Waiting', className: 'bg-yellow-100 text-yellow-700' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500' },
  superseded: { label: 'Superseded', className: 'bg-slate-100 text-slate-500' },
};

function SubgoalStatusIcon({ status }: { status: SubgoalStatus }) {
  switch (status) {
    case 'pending':
      return <Circle className="h-3.5 w-3.5 text-slate-400" />;
    case 'in_progress':
      return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    case 'waiting':
      return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    case 'blocked':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'skipped':
      return <Minus className="h-3.5 w-3.5 text-slate-400" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-slate-300" />;
  }
}

function SubgoalItem({ subgoal }: { subgoal: OrchestratorSubgoal }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
        subgoal.status === 'blocked' && 'bg-red-50/50',
        subgoal.status === 'in_progress' && 'bg-blue-50/50',
        subgoal.status === 'completed' && 'bg-green-50/30',
      )}
    >
      <div className="mt-0.5 shrink-0">
        <SubgoalStatusIcon status={subgoal.status} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-xs font-medium',
            subgoal.status === 'completed' && 'text-muted-foreground line-through',
            subgoal.status === 'skipped' && 'text-muted-foreground line-through',
          )}
        >
          {subgoal.title}
        </p>
        {subgoal.intent && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {subgoal.intent}
          </p>
        )}
        {subgoal.status === 'blocked' && subgoal.blocked_reason && (
          <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            {subgoal.blocked_reason}
          </p>
        )}
      </div>
    </div>
  );
}

function PlanLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PlanOverview({ orchestratorId, organizationId }: PlanOverviewProps) {
  const [plan, setPlan] = useState<OrchestratorPlan | null>(null);
  const [subgoals, setSubgoals] = useState<OrchestratorSubgoal[]>([]);
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const result = await getActivePlanAction(orchestratorId);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setPlan(result.data.plan as OrchestratorPlan);
        setSubgoals(result.data.subgoals as OrchestratorSubgoal[]);
        setProgress(result.data.progress as PlanProgress);
        setRevisions(result.data.revisions as PlanRevision[]);
      } else {
        setPlan(null);
        setSubgoals([]);
        setProgress(null);
        setRevisions([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    }
  }, [orchestratorId]);

  useEffect(() => {
    setLoading(true);
    fetchPlan().finally(() => setLoading(false));
  }, [fetchPlan]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchPlan, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchPlan]);

  if (loading) {
    return <PlanLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No active plan</p>
        <p className="text-xs text-muted-foreground">
          The orchestrator has not created a plan yet.
        </p>
      </div>
    );
  }

  const statusCfg = planStatusConfig[plan.status] ?? planStatusConfig.draft;

  return (
    <div className="space-y-5">
      {/* Plan header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <Badge className={cn('text-[10px] font-medium', statusCfg.className)}>
            {statusCfg.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium tabular-nums">
            <Hash className="h-2.5 w-2.5 mr-0.5" />
            v{plan.version}
          </Badge>
        </div>
        <p className="text-sm font-semibold tracking-tight">{plan.title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {plan.objective}
        </p>
      </div>

      {/* Blocked reason */}
      {plan.status === 'blocked' && plan.blocked_reason && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50/50 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-relaxed">{plan.blocked_reason}</p>
        </div>
      )}

      {/* Progress bar */}
      {progress && progress.total_subgoals > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Progress
            </p>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {progress.completion_percentage}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress.completion_percentage === 100
                  ? 'bg-green-500'
                  : progress.blocked > 0
                    ? 'bg-amber-500'
                    : 'bg-blue-500',
              )}
              style={{ width: `${progress.completion_percentage}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2">
            {progress.completed > 0 && (
              <span className="text-[10px] text-green-600 tabular-nums">
                {progress.completed} done
              </span>
            )}
            {progress.in_progress > 0 && (
              <span className="text-[10px] text-blue-600 tabular-nums">
                {progress.in_progress} active
              </span>
            )}
            {progress.waiting > 0 && (
              <span className="text-[10px] text-yellow-600 tabular-nums">
                {progress.waiting} waiting
              </span>
            )}
            {progress.blocked > 0 && (
              <span className="text-[10px] text-red-600 tabular-nums">
                {progress.blocked} blocked
              </span>
            )}
            {progress.pending > 0 && (
              <span className="text-[10px] text-slate-500 tabular-nums">
                {progress.pending} pending
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subgoals */}
      {subgoals.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
            Subgoals
          </p>
          <div className="space-y-1">
            {subgoals.map((sg) => (
              <SubgoalItem key={sg.id} subgoal={sg} />
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Created
          </p>
          <p className="text-xs text-foreground">
            {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Last Revised
          </p>
          <p className="text-xs text-foreground">
            {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Revision history */}
      <PlanRevisionHistory revisions={revisions} />
    </div>
  );
}
