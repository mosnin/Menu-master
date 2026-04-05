'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  Pause,
  Play,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  getWorkflowRunAction,
  getWorkflowAutomationTraceAction,
  pauseRunAction,
  resumeRunAction,
  cancelRunAction,
  rerunWorkflowAction,
  overrideStepAction,
} from '@/app/actions/workflow-actions';
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

// ---------------------------------------------------------------------------
// Duration color helper
// ---------------------------------------------------------------------------

function durationColorClass(ms: number): string {
  if (ms < 1000) return 'text-green-600';
  if (ms <= 5000) return 'text-amber-600';
  return 'text-red-600';
}

function durationBgClass(ms: number): string {
  if (ms < 1000) return 'bg-green-100';
  if (ms <= 5000) return 'bg-amber-100';
  return 'bg-red-100';
}

// ---------------------------------------------------------------------------
// Collapsible JSON viewer
// ---------------------------------------------------------------------------

function CollapsibleJson({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const hasData = data && Object.keys(data).length > 0;
  if (!hasData) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label}
      </button>
      {open && (
        <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step override dialog (inline)
// ---------------------------------------------------------------------------

function StepOverrideForm({
  runId,
  stepId,
  onDone,
}: {
  runId: string;
  stepId: string;
  onDone: () => void;
}) {
  const [json, setJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError('Invalid JSON');
      return;
    }
    setSubmitting(true);
    const result = await overrideStepAction(runId, stepId, parsed);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      onDone();
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-[11px] font-medium text-amber-800">Override step output</p>
      <textarea
        className="w-full rounded-md border border-amber-300 bg-white p-2 text-[11px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400"
        rows={5}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='{"key": "value"}'
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          onClick={onDone}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-[11px]"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Apply Override'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function WorkflowRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [steps, setSteps] = useState<WorkflowRunStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [automationTrace, setAutomationTrace] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [overrideStepId, setOverrideStepId] = useState<string | null>(null);

  const loadRun = useCallback(async () => {
    try {
      const result = await getWorkflowRunAction(params.runId);
      if (result) {
        setRun(result.run);
        setSteps(result.steps);
        const traceEvents = await getWorkflowAutomationTraceAction(params.runId);
        setAutomationTrace(traceEvents);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [params.runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  // ---- Run control handlers ----

  async function handlePause() {
    setActionLoading('pause');
    const result = await pauseRunAction(params.runId);
    setActionLoading(null);
    if (!result.error) await loadRun();
  }

  async function handleResume() {
    setActionLoading('resume');
    const result = await resumeRunAction(params.runId);
    setActionLoading(null);
    if (!result.error) await loadRun();
  }

  async function handleCancel() {
    setActionLoading('cancel');
    const result = await cancelRunAction(params.runId);
    setActionLoading(null);
    if (!result.error) await loadRun();
  }

  async function handleRerun() {
    setActionLoading('rerun');
    const result = await rerunWorkflowAction(params.runId);
    setActionLoading(null);
    if (result.id) {
      router.push(`/ops/workflow-runs/${result.id}`);
    }
  }

  // ---- Determine which steps are "after" a failed step ----

  const failedStepIndex = steps.findIndex((s) => s.status === 'failed');

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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
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

            {/* Run control buttons */}
            <div className="flex items-center gap-2">
              {run.status === 'running' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] gap-1.5"
                  onClick={handlePause}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'pause' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  Pause
                </Button>
              )}

              {run.status === 'waiting' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] gap-1.5"
                  onClick={handleResume}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'resume' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Resume
                </Button>
              )}

              {(run.status === 'running' || run.status === 'waiting') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'cancel' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  Cancel
                </Button>
              )}

              {(run.status === 'completed' ||
                run.status === 'failed' ||
                run.status === 'cancelled') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] gap-1.5"
                  onClick={handleRerun}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'rerun' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Re-run
                </Button>
              )}
            </div>
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

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Unified Automation Trace
          </p>
          {automationTrace.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/70">No shared automation trace events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {automationTrace.slice(0, 20).map((event: any) => (
                <div key={event.id} className="rounded-lg border p-3 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{event.tool_name ?? 'policy-evaluation'}</p>
                    <Badge variant="outline" className="text-[10px]">{event.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{event.outcome_summary ?? event.policy_reason ?? 'No summary'}</p>
                </div>
              ))}
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
              {steps.map((step, index) => {
                const isAfterFailed =
                  failedStepIndex >= 0 &&
                  index > failedStepIndex &&
                  step.status !== 'failed';
                const effectiveStatus = isAfterFailed ? 'skipped' : step.status;
                const Icon = stepStatusIcon[effectiveStatus] ?? Clock;
                const isFailed = step.status === 'failed';
                const canOverride =
                  step.status === 'failed' || step.status === 'waiting';

                return (
                  <div key={step.id} className="relative flex items-start gap-4 pl-4">
                    {/* Status dot */}
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 shrink-0"
                      style={{ borderColor: 'inherit' }}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${stepBorderColor[effectiveStatus] ?? ''}`}>
                        <Icon className={`h-3.5 w-3.5 ${stepStatusColor[effectiveStatus] ?? ''}`} />
                      </div>
                    </div>

                    {/* Step card */}
                    <Card
                      className={`flex-1 rounded-xl shadow-sm ${
                        isFailed ? 'border-l-4 border-l-red-500' : ''
                      } ${isAfterFailed ? 'opacity-50' : ''}`}
                    >
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
                              <span
                                className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${durationBgClass(step.duration_ms)} ${durationColorClass(step.duration_ms)}`}
                              >
                                {step.duration_ms}ms
                              </span>
                            )}
                            {step.retry_count > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-amber-300 text-amber-700">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {step.retry_count} {step.retry_count === 1 ? 'retry' : 'retries'}
                              </Badge>
                            )}
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border-0 ${runStatusColor[effectiveStatus] ?? 'bg-gray-100 text-gray-800'}`}
                            >
                              {humanizeStatus(effectiveStatus)}
                            </Badge>
                          </div>
                        </div>

                        {step.error_message && (
                          <div className="mt-2 rounded-md bg-red-50 px-3 py-2">
                            <p className="text-[11px] text-red-700">{step.error_message}</p>
                          </div>
                        )}

                        {/* Collapsible input/output data */}
                        <CollapsibleJson label="Input Data" data={step.input_data} />
                        <CollapsibleJson label="Output Data" data={step.output_data} />

                        {/* Agent node inspection */}
                        {isAgentNodeType(step.node_type) && step.output_data && (
                          <div className="mt-3">
                            <AgentNodeInspector
                              result={(step.output_data as Record<string, unknown>).agent_result as AgentNodeResult ?? null}
                              definition={getAgentNodeDefinition(step.node_type as Parameters<typeof getAgentNodeDefinition>[0]) ?? null}
                            />
                          </div>
                        )}

                        {/* Override button for failed/waiting steps */}
                        {canOverride && overrideStepId !== step.id && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => setOverrideStepId(step.id)}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Override
                            </Button>
                          </div>
                        )}

                        {/* Override form */}
                        {overrideStepId === step.id && (
                          <StepOverrideForm
                            runId={params.runId}
                            stepId={step.id}
                            onDone={() => {
                              setOverrideStepId(null);
                              loadRun();
                            }}
                          />
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
