'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Brain, Clock, Play, Pause, Shield, AlertTriangle, Eye, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DealOrchestrator, OrchestratorPriority } from '@/types';

interface OrchestratorStatusCardProps {
  orchestrator: DealOrchestrator | null;
  onPauseResume?: (id: string, action: 'pause' | 'resume') => void;
}

const priorityConfig: Record<OrchestratorPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

export function OrchestratorStatusCard({
  orchestrator,
  onPauseResume,
}: OrchestratorStatusCardProps) {
  if (!orchestrator) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 px-7">
          <div className="rounded-xl bg-muted p-3 mb-4">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold tracking-tight mb-1">Orchestrator Inactive</p>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Enable the AI orchestrator to get automated monitoring and recommendations.
          </p>
          <Button className="rounded-xl" size="sm">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Enable Orchestrator
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isActive = orchestrator.status === 'active';
  const priority = priorityConfig[orchestrator.priority] ?? priorityConfig.normal;
  const riskText =
    orchestrator.risk_summary && typeof orchestrator.risk_summary === 'object'
      ? (orchestrator.risk_summary as Record<string, unknown>).summary as string | undefined
      : undefined;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Orchestrator
          </span>
          <Badge
            className={cn(
              'text-[10px] font-medium flex items-center gap-1.5',
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isActive ? 'bg-green-500' : 'bg-slate-400',
              )}
            />
            {isActive ? 'Active' : 'Paused'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Last Observed
            </p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              {orchestrator.last_observed_at
                ? formatDistanceToNow(new Date(orchestrator.last_observed_at), {
                    addSuffix: true,
                  })
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Cycles
            </p>
            <p className="text-sm font-medium tabular-nums">{orchestrator.cycle_count}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Priority
            </p>
            <Badge className={cn('text-[10px] font-medium', priority.className)}>
              {priority.label}
            </Badge>
          </div>
        </div>

        {/* Risk summary */}
        {riskText && (
          <>
            <Separator />
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{riskText}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Pause / Resume */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isActive ? 'Orchestrator is monitoring this deal.' : 'Orchestrator is paused.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-8"
            onClick={() =>
              onPauseResume?.(orchestrator.id, isActive ? 'pause' : 'resume')
            }
          >
            {isActive ? (
              <>
                <Pause className="h-3 w-3 mr-1.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1.5" />
                Resume
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
