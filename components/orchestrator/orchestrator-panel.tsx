'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, RefreshCw, Target, Activity, Eye, Zap, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrchestratorStatusCard } from './orchestrator-status-card';
import { NextActionsPanel } from './next-actions-panel';
import { PlanOverview } from './plan-overview';
import { ReasoningSummary } from './reasoning-summary';
import { AgentActivityFeed } from './agent-activity-feed';
import { ExecutionMonitor } from './execution-monitor';
import { FollowThroughPanel } from './follow-through-panel';
import {
  getOrchestratorAction,
  getNextActionsAction,
  getRecentCyclesAction,
  getRecentExecutionsAction,
  getActivePlanAction,
  pauseOrchestratorAction,
  resumeOrchestratorAction,
  dismissNextActionAction,
  resolveNextActionAction,
  triggerManualCycleAction,
} from '@/app/actions/orchestrator-actions';
import type {
  DealOrchestrator,
  OrchestratorNextAction,
  OrchestratorCycle,
  OrchestratorActionExecution,
  OrchestratorEntityType,
  PlanStatus,
} from '@/types';

interface PlanSummaryData {
  objective: string;
  status: PlanStatus;
  completionPercentage: number;
}

interface OrchestratorPanelProps {
  entityType: OrchestratorEntityType;
  entityId: string;
}

const AUTO_REFRESH_MS = 60_000;

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <p className="text-sm text-red-600 mb-3">{message}</p>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={onRetry}>
        <RefreshCw className="h-3 w-3 mr-1.5" />
        Retry
      </Button>
    </div>
  );
}

export function OrchestratorPanel({ entityType, entityId }: OrchestratorPanelProps) {
  const [orchestrator, setOrchestrator] = useState<DealOrchestrator | null>(null);
  const [actions, setActions] = useState<OrchestratorNextAction[]>([]);
  const [cycles, setCycles] = useState<OrchestratorCycle[]>([]);
  const [executions, setExecutions] = useState<OrchestratorActionExecution[]>([]);
  const [planSummary, setPlanSummary] = useState<PlanSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const orchResult = await getOrchestratorAction(entityType, entityId);
      if (orchResult.error) {
        setError(orchResult.error);
        return;
      }

      const orch = orchResult.data ?? null;
      setOrchestrator(orch);

      if (orch) {
        const [actionsResult, cyclesResult, execResult, planResult] = await Promise.all([
          getNextActionsAction(orch.id),
          getRecentCyclesAction(orch.id, 5),
          getRecentExecutionsAction(orch.id, 10),
          getActivePlanAction(orch.id),
        ]);

        setActions(actionsResult.data ?? []);
        setCycles(cyclesResult.data ?? []);
        setExecutions(execResult.data ?? []);

        if (planResult.data?.plan) {
          const p = planResult.data.plan as { objective: string; status: PlanStatus };
          const prog = planResult.data.progress as { completion_percentage: number } | null;
          setPlanSummary({
            objective: p.objective,
            status: p.status,
            completionPercentage: prog?.completion_percentage ?? 0,
          });
        } else {
          setPlanSummary(null);
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, [entityType, entityId]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePauseResume = useCallback(
    async (id: string, action: 'pause' | 'resume') => {
      const result =
        action === 'pause'
          ? await pauseOrchestratorAction(id)
          : await resumeOrchestratorAction(id);

      if (!result.error) {
        await fetchData();
      }
    },
    [fetchData],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      const result = await dismissNextActionAction(id);
      if (!result.error) {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }
    },
    [],
  );

  const handleResolve = useCallback(
    async (id: string) => {
      const result = await resolveNextActionAction(id);
      if (!result.error) {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }
    },
    [],
  );

  const handleTriggerCycle = useCallback(async () => {
    if (!orchestrator) return;
    const result = await triggerManualCycleAction(orchestrator.id);
    if (!result.error) {
      // Wait a moment then refresh to pick up the new cycle
      setTimeout(() => fetchData(), 2000);
    }
  }, [orchestrator, fetchData]);

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 p-7">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Orchestrator
          </CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-0">
          <LoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 p-7">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Orchestrator
          </CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-0">
          <ErrorState message={error} onRetry={loadInitial} />
        </CardContent>
      </Card>
    );
  }

  if (!orchestrator) {
    return <OrchestratorStatusCard orchestrator={null} />;
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Orchestrator
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={handleTriggerCycle}
              title="Trigger manual cycle"
            >
              <RefreshCw
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground',
                  refreshing && 'animate-spin',
                )}
              />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0">
        <Tabs defaultValue="status">
          <TabsList className="w-full">
            <TabsTrigger value="status" className="flex-1 text-xs">
              <Eye className="h-3 w-3 mr-1.5" />
              Status
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex-1 text-xs">
              <Map className="h-3 w-3 mr-1.5" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 text-xs">
              <Target className="h-3 w-3 mr-1.5" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="execution" className="flex-1 text-xs">
              <Zap className="h-3 w-3 mr-1.5" />
              Execution
            </TabsTrigger>
            <TabsTrigger value="reasoning" className="flex-1 text-xs">
              <Brain className="h-3 w-3 mr-1.5" />
              Reasoning
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-xs">
              <Activity className="h-3 w-3 mr-1.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-4">
            <OrchestratorStatusCard
              orchestrator={orchestrator}
              onPauseResume={handlePauseResume}
              planSummary={planSummary}
            />
          </TabsContent>

          <TabsContent value="plan" className="mt-4">
            <PlanOverview
              orchestratorId={orchestrator.id}
              organizationId={orchestrator.organization_id}
            />
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <NextActionsPanel
              actions={actions}
              onDismiss={handleDismiss}
              onResolve={handleResolve}
            />
          </TabsContent>

          <TabsContent value="execution" className="mt-4 space-y-6">
            <ExecutionMonitor
              orchestratorId={orchestrator.id}
              organizationId={orchestrator.organization_id}
            />
            <FollowThroughPanel orchestratorId={orchestrator.id} />
          </TabsContent>

          <TabsContent value="reasoning" className="mt-4">
            <ReasoningSummary cycles={cycles} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <AgentActivityFeed executions={executions} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
