'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2, SkipForward, Pause } from 'lucide-react';
import { getWorkflowRunAction } from '@/app/actions/workflow-actions';
import { formatDate, formatDateTime, humanizeStatus } from '@/lib/format';
import { AgentNodeInspector } from '@/components/workflow/agent-node-inspector';
import { isAgentNodeType } from '@/lib/ai/agent-nodes/registry';
import { getAgentNodeDefinition } from '@/lib/ai/agent-nodes/registry';
import '@/lib/ai/agent-nodes/definitions'; // Ensure definitions are registered
import type { AgentNodeResult } from '@/lib/ai/agent-nodes/types';
import type { WorkflowRun, WorkflowRunStep } from '@/types';

const runStatusColor: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  waiting: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  timed_out: 'bg-orange-100 text-orange-800',
};

const stepStatusIcon: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
  skipped: SkipForward,
  waiting: Pause,
};

const stepStatusColor: Record<string, string> = {
  completed: 'text-green-600',
  failed: 'text-red-600',
  running: 'text-blue-600 animate-spin',
  pending: 'text-muted-foreground/40',
  skipped: 'text-muted-foreground/40',
  waiting: 'text-purple-600',
};

const stepBorderColor: Record<string, string> = {
  completed: 'border-green-200',
  failed: 'border-red-200',
  running: 'border-blue-200',
  pending: 'border-border/40',
  skipped: 'border-border/30',
  waiting: 'border-purple-200',
};

export default function WorkflowRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [steps, setSteps] = useState<WorkflowRunStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getWorkflowRunAction(params.runId);
        if (result) {
          setRun(result.run);
          setSteps(result.steps);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.runId]);

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader title="Run Detail" backHref="/ops/workflow-runs" backLabel="Workflow Runs" />
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-[13px] text-muted-foreground/60">Loading run details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-10">
        <PageHeader title="Run Detail" backHref="/ops/workflow-runs" backLabel="Workflow Runs" />
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-[13px] font-medium">Run not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Run Detail"
        description={`Run ${params.runId.slice(0, 8)}...`}
        backHref="/ops/workflow-runs"
        backLabel="Workflow Runs"
      />

      {/* Run Metadata */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <Badge
              className={`text-[10px] px-2 py-0.5 border-0 ${runStatusColor[run.status] ?? 'bg-gray-100 text-gray-800'}`}
            >
              {humanizeStatus(run.status)}
            </Badge>
            {run.trigger_event_type && (
              <span className="text-[12px] text-muted-foreground/60">
                Trigger: {humanizeStatus(run.trigger_event_type)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
            <div>
              <p className="text-muted-foreground/50 mb-1">Started</p>
              <p className="font-medium">{run.started_at ? formatDateTime(run.started_at) : '--'}</p>
            </div>
            <div>
              <p className="text-muted-foreground/50 mb-1">Completed</p>
              <p className="font-medium">{run.completed_at ? formatDateTime(run.completed_at) : '--'}</p>
            </div>
            <div>
              <p className="text-muted-foreground/50 mb-1">Steps</p>
              <p className="font-medium">{run.completed_steps} / {run.total_steps}</p>
            </div>
            <div>
              <p className="text-muted-foreground/50 mb-1">Entity</p>
              <p className="font-medium">
                {run.entity_type && run.entity_id
                  ? `${humanizeStatus(run.entity_type)} ${run.entity_id.slice(0, 8)}`
                  : '--'}
              </p>
            </div>
          </div>

          {run.error_message && (
            <div className="mt-5 rounded-lg bg-red-50 p-4">
              <p className="text-[12px] font-medium text-red-800">Error</p>
              <p className="text-[12px] text-red-700 mt-1">{run.error_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Timeline */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Step Trace
        </h3>

        {steps.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-[13px] text-muted-foreground/60">No steps recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border/40" />

            <div className="space-y-3">
              {steps.map((step) => {
                const Icon = stepStatusIcon[step.status] ?? Clock;
                return (
                  <div key={step.id} className="relative flex items-start gap-4 pl-4">
                    {/* Status dot */}
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 shrink-0"
                      style={{ borderColor: 'inherit' }}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${stepBorderColor[step.status] ?? ''}`}>
                        <Icon className={`h-3.5 w-3.5 ${stepStatusColor[step.status] ?? ''}`} />
                      </div>
                    </div>

                    {/* Step card */}
                    <Card className="flex-1 rounded-xl shadow-sm">
                      <CardContent className="py-3 px-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground/40">
                              #{step.step_number}
                            </span>
                            <p className="text-[13px] font-semibold tracking-[-0.01em]">
                              {step.node_label ?? step.node_id}
                            </p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {step.node_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {step.duration_ms != null && (
                              <span className="text-[11px] text-muted-foreground/50">
                                {step.duration_ms}ms
                              </span>
                            )}
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border-0 ${runStatusColor[step.status] ?? 'bg-gray-100 text-gray-800'}`}
                            >
                              {humanizeStatus(step.status)}
                            </Badge>
                          </div>
                        </div>

                        {step.error_message && (
                          <div className="mt-2 rounded-md bg-red-50 px-3 py-2">
                            <p className="text-[11px] text-red-700">{step.error_message}</p>
                          </div>
                        )}

                        {/* Agent node inspection */}
                        {isAgentNodeType(step.node_type) && step.output_data && (
                          <div className="mt-3">
                            <AgentNodeInspector
                              result={(step.output_data as Record<string, unknown>).agent_result as AgentNodeResult ?? null}
                              definition={getAgentNodeDefinition(step.node_type as Parameters<typeof getAgentNodeDefinition>[0]) ?? null}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
