'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Pause,
  Play,
  Square,
  X,
  ListChecks,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  getFollowThroughRunsAction,
  cancelFollowThroughAction,
} from '@/app/actions/orchestrator-actions';

interface FollowThroughStep {
  name: string;
  description: string;
  status: 'completed' | 'active' | 'pending' | 'skipped';
}

interface FollowThroughRun {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'waiting' | 'completed' | 'cancelled';
  current_step: number;
  total_steps: number;
  steps: FollowThroughStep[];
  exit_conditions: string[];
  allows_cancellation: boolean;
  started_at: string;
}

interface FollowThroughPanelProps {
  orchestratorId: string;
}

const statusConfig: Record<
  FollowThroughRun['status'],
  { label: string; className: string; icon: React.ElementType }
> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700',
    icon: Play,
  },
  waiting: {
    label: 'Waiting',
    className: 'bg-amber-100 text-amber-700',
    icon: Pause,
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700',
    icon: Check,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600',
    icon: X,
  },
};

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
        {current}/{total}
      </span>
    </div>
  );
}

function StepIndicator({ step, index }: { step: FollowThroughStep; index: number }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          'h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium mt-0.5',
          step.status === 'completed' && 'bg-green-100 text-green-700',
          step.status === 'active' && 'bg-primary text-primary-foreground',
          step.status === 'pending' && 'bg-muted text-muted-foreground',
          step.status === 'skipped' && 'bg-slate-100 text-slate-400 line-through',
        )}
      >
        {step.status === 'completed' ? (
          <Check className="h-3 w-3" />
        ) : step.status === 'active' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          index + 1
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-xs font-medium',
            step.status === 'pending' && 'text-muted-foreground',
            step.status === 'skipped' && 'text-muted-foreground/60 line-through',
          )}
        >
          {step.name}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  );
}

function FollowThroughCard({
  run,
  onCancel,
}: {
  run: FollowThroughRun;
  onCancel: (id: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const config = statusConfig[run.status] ?? statusConfig.active;
  const StatusIcon = config.icon;

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(run.id);
    setCancelling(false);
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="px-5 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={cn('text-[10px] font-medium', config.className)}>
                <StatusIcon className="h-2.5 w-2.5 mr-1" />
                {config.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Started {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm font-semibold tracking-tight">{run.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {run.description}
            </p>
          </div>
          {run.allows_cancellation && run.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  <span className="text-[11px]">Cancel</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Progress */}
        <ProgressBar current={run.current_step} total={run.total_steps} />

        {/* Steps */}
        {run.steps.length > 0 && (
          <div className="space-y-2 pl-0.5">
            {run.steps.map((step, idx) => (
              <StepIndicator key={idx} step={step} index={idx} />
            ))}
          </div>
        )}

        {/* Exit conditions */}
        {run.exit_conditions.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mb-1">
              Exit Conditions
            </p>
            <ul className="space-y-0.5">
              {run.exit_conditions.map((condition, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                >
                  <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                  {condition}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowThroughPanel({ orchestratorId }: FollowThroughPanelProps) {
  const [runs, setRuns] = useState<FollowThroughRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await getFollowThroughRunsAction(orchestratorId);
      if (result.data) {
        setRuns(result.data as FollowThroughRun[]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [orchestratorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = useCallback(
    async (runId: string) => {
      const result = await cancelFollowThroughAction(runId);
      if (!result.error) {
        setRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, status: 'cancelled' as const } : r)),
        );
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No active sequences</p>
        <p className="text-xs text-muted-foreground">
          Follow-through sequences will appear here when running.
        </p>
      </div>
    );
  }

  const active = runs.filter((r) => r.status === 'active' || r.status === 'waiting');
  const finished = runs.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Active Sequences
          </p>
          {active.map((run) => (
            <FollowThroughCard key={run.id} run={run} onCancel={handleCancel} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Completed
          </p>
          {finished.map((run) => (
            <FollowThroughCard key={run.id} run={run} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
