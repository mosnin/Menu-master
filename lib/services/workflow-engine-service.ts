import * as workflowRunsRepo from '@/lib/repositories/workflow-runs';
import * as workflowRunStepsRepo from '@/lib/repositories/workflow-run-steps';
import * as workflowVersionsRepo from '@/lib/repositories/workflow-versions';
import { logAction } from '@/lib/audit/logger';
import { isAgentNodeType } from '@/lib/ai/agent-nodes/registry';
import { executeAgentNode } from '@/lib/ai/agent-nodes/executor';
import type {
  WorkflowRun,
  WorkflowRunStep,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraphData,
  WorkflowStepStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_STEP_DEPTH = 500; // hard limit to prevent runaway recursion

// ---------------------------------------------------------------------------
// Domain node types that delegate to executeDomainNode
// ---------------------------------------------------------------------------

const DOMAIN_NODE_TYPES = new Set([
  'evaluate_transaction_completeness',
  'evaluate_listing_readiness',
  'evaluate_closing_readiness',
  'create_notification',
  'create_approval',
  'create_checklist_item',
  'create_timeline_event',
  'request_missing_document',
  'recompute_health_score',
  'recompute_exceptions',
  'transition_transaction_stage',
  'transition_listing_stage',
  'handoff_accepted_offer',
  'emit_webhook',
  'send_digest',
  'agent_next_best_action_planner',
  'agent_exception_triage_classifier',
  'agent_document_classifier',
  'agent_offer_explanation',
  'agent_communication_draft',
  'agent_compliance_critic',
  'agent_deal_router',
]);

// ---------------------------------------------------------------------------
// Start a new workflow run
// ---------------------------------------------------------------------------

export async function startWorkflowRun(
  workflowVersionId: string,
  orgId: string,
  triggerEventType: string,
  triggerPayload: Record<string, unknown>,
  options?: {
    entityType?: string;
    entityId?: string;
    initiatedByUserId?: string;
  },
): Promise<WorkflowRun> {
  const version = await workflowVersionsRepo.findById(workflowVersionId);
  if (!version) throw new Error('Workflow version not found');

  const graph: WorkflowGraphData = version.graph_data;
  const startNode = graph.nodes.find((n) => n.type === 'start');
  if (!startNode) throw new Error('Workflow has no start node');

  const run = await workflowRunsRepo.create({
    workflow_id: version.workflow_id,
    workflow_version_id: workflowVersionId,
    organization_id: orgId,
    status: 'running',
    trigger_event_type: triggerEventType,
    trigger_payload: triggerPayload,
    context_data: { _loop_counts: {}, _trigger_payload: triggerPayload },
    current_node_id: startNode.id,
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
    entity_type: options?.entityType ?? null,
    entity_id: options?.entityId ?? null,
    initiated_by_user_id: options?.initiatedByUserId ?? null,
    total_steps: 0,
    completed_steps: 0,
  });

  await logAction({
    organizationId: orgId,
    actorType: options?.initiatedByUserId ? 'user' : 'system',
    actorUserId: options?.initiatedByUserId ?? undefined,
    action: 'workflow.run_started',
    targetType: 'workflow_run',
    targetId: run.id,
    metadata: {
      workflow_id: version.workflow_id,
      workflow_version_id: workflowVersionId,
      trigger_event_type: triggerEventType,
    },
  });

  // Execute the start node
  await executeStep(run.id, startNode.id);

  // Re-fetch the run to get the latest state
  const updatedRun = await workflowRunsRepo.findById(run.id);
  return updatedRun ?? run;
}

// ---------------------------------------------------------------------------
// Execute a single step
// ---------------------------------------------------------------------------

export async function executeStep(
  runId: string,
  nodeId: string,
): Promise<WorkflowRunStep> {
  const run = await workflowRunsRepo.findById(runId);
  if (!run) throw new Error('Workflow run not found');
  if (run.status !== 'running') throw new Error(`Cannot execute step: run status is "${run.status}"`);

  const version = await workflowVersionsRepo.findById(run.workflow_version_id);
  if (!version) throw new Error('Workflow version not found');

  const graph: WorkflowGraphData = version.graph_data;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found in workflow graph`);

  // Depth safeguard
  const existingSteps = await workflowRunStepsRepo.findByRunId(runId);
  if (existingSteps.length >= MAX_STEP_DEPTH) {
    await failRun(run, `Exceeded maximum step count of ${MAX_STEP_DEPTH}`);
    throw new Error(`Exceeded maximum step count of ${MAX_STEP_DEPTH}`);
  }

  const stepNumber = existingSteps.length + 1;
  const startedAt = new Date().toISOString();

  // Create the step record
  const step = await workflowRunStepsRepo.create({
    run_id: runId,
    node_id: nodeId,
    node_type: node.type,
    node_label: node.label ?? null,
    step_number: stepNumber,
    status: 'running',
    input_data: run.context_data,
    output_data: {},
    error_message: null,
    retry_count: 0,
    max_retries: node.retry_policy?.max_retries ?? 0,
    started_at: startedAt,
    completed_at: null,
    duration_ms: null,
  });

  // Update run current node
  await workflowRunsRepo.update(runId, {
    current_node_id: nodeId,
    total_steps: stepNumber,
  });

  try {
    // Evaluate the node
    const result = await evaluateNode(step, node, run.context_data, graph, run);

    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // Determine step status based on node type
    let stepStatus: WorkflowStepStatus = 'completed';
    if (node.type === 'wait' || node.type === 'human_checkpoint') {
      stepStatus = 'waiting';
    }

    // Update step
    const updatedStep = await workflowRunStepsRepo.update(step.id, {
      status: stepStatus,
      output_data: result.output,
      completed_at: stepStatus === 'completed' ? completedAt : null,
      duration_ms: stepStatus === 'completed' ? durationMs : null,
    });

    // Merge output into run context
    const updatedContext = { ...run.context_data, ...result.output };
    await workflowRunsRepo.update(runId, {
      context_data: updatedContext,
      completed_steps: run.completed_steps + 1,
    });

    await logAction({
      organizationId: run.organization_id,
      actorType: 'system',
      action: 'workflow.step_completed',
      targetType: 'workflow_run_step',
      targetId: step.id,
      metadata: { run_id: runId, node_id: nodeId, node_type: node.type },
    });

    // If step is waiting, do not recurse
    if (stepStatus === 'waiting') {
      return updatedStep;
    }

    // Recurse for each next node
    for (const nextNodeId of result.nextNodeIds) {
      await executeStep(runId, nextNodeId);
    }

    return updatedStep;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await workflowRunStepsRepo.update(step.id, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    });

    await logAction({
      organizationId: run.organization_id,
      actorType: 'system',
      action: 'workflow.step_failed',
      targetType: 'workflow_run_step',
      targetId: step.id,
      metadata: { run_id: runId, node_id: nodeId, error: errorMessage },
    });

    await failRun(run, errorMessage);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Evaluate a node and determine next nodes
// ---------------------------------------------------------------------------

export async function evaluateNode(
  step: WorkflowRunStep,
  node: WorkflowNode,
  context: Record<string, unknown>,
  graph: WorkflowGraphData,
  run: WorkflowRun,
): Promise<{ output: Record<string, unknown>; nextNodeIds: string[] }> {
  const outgoingEdges = graph.edges
    .filter((e) => e.source_node_id === node.id)
    .sort((a, b) => a.order - b.order);

  switch (node.type) {
    case 'start': {
      return {
        output: { _started: true },
        nextNodeIds: outgoingEdges.map((e) => e.target_node_id),
      };
    }

    case 'stop': {
      // Mark run as completed
      await workflowRunsRepo.update(run.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      await logAction({
        organizationId: run.organization_id,
        actorType: 'system',
        action: 'workflow.run_completed',
        targetType: 'workflow_run',
        targetId: run.id,
        metadata: { workflow_id: run.workflow_id },
      });

      return { output: { _stopped: true }, nextNodeIds: [] };
    }

    case 'condition': {
      // Evaluate config.expression against context; pick matching branch
      const expression = node.config.expression as string | undefined;
      let result = false;
      if (expression) {
        try {
          result = evaluateExpression(expression, context);
        } catch {
          result = false;
        }
      }

      // First edge = true branch, second = false branch
      const targetEdge = result ? outgoingEdges[0] : outgoingEdges[1];
      const nextNodeIds = targetEdge ? [targetEdge.target_node_id] : [];

      return {
        output: { _condition_result: result },
        nextNodeIds,
      };
    }

    case 'branch': {
      // Pick edge based on config.branch_key matching edge labels
      const branchKey = node.config.branch_key as string | undefined;
      const branchValue = branchKey ? String(context[branchKey] ?? '') : '';
      const matchingEdge = outgoingEdges.find((e) => e.label === branchValue);
      const fallbackEdge = outgoingEdges.find((e) => e.label === '_default') ?? outgoingEdges[0];
      const selectedEdge = matchingEdge ?? fallbackEdge;

      return {
        output: { _branch_value: branchValue },
        nextNodeIds: selectedEdge ? [selectedEdge.target_node_id] : [],
      };
    }

    case 'wait': {
      // Mark run as waiting
      await workflowRunsRepo.update(run.id, {
        status: 'waiting',
        current_node_id: node.id,
      });

      return {
        output: {
          _wait_type: node.config.wait_type,
          _waiting_since: new Date().toISOString(),
        },
        nextNodeIds: [], // will be resumed later
      };
    }

    case 'loop': {
      // Loop safeguard: track iterations in context_data._loop_counts
      const loopCounts = (context._loop_counts ?? {}) as Record<string, number>;
      const currentCount = (loopCounts[node.id] ?? 0) + 1;
      const maxIterations = node.config.max_iterations as number;

      if (currentCount > maxIterations) {
        throw new Error(
          `Loop node "${node.id}" exceeded max_iterations (${maxIterations})`,
        );
      }

      // Update loop counts in context
      const updatedLoopCounts = { ...loopCounts, [node.id]: currentCount };
      await workflowRunsRepo.update(run.id, {
        context_data: { ...context, _loop_counts: updatedLoopCounts },
      });

      // Evaluate exit condition
      const exitCondition = node.config.exit_condition as string;
      let shouldExit = false;
      try {
        shouldExit = evaluateExpression(exitCondition, {
          ...context,
          _loop_counts: updatedLoopCounts,
          _current_iteration: currentCount,
        });
      } catch {
        shouldExit = false;
      }

      if (shouldExit) {
        // Exit the loop: take the second edge (exit path) if available, else first
        const exitEdge = outgoingEdges[1] ?? outgoingEdges[0];
        return {
          output: { _loop_exited: true, _loop_iteration: currentCount, _loop_counts: updatedLoopCounts },
          nextNodeIds: exitEdge ? [exitEdge.target_node_id] : [],
        };
      }

      // Continue looping: take the first edge (loop body)
      const loopEdge = outgoingEdges[0];
      return {
        output: { _loop_exited: false, _loop_iteration: currentCount, _loop_counts: updatedLoopCounts },
        nextNodeIds: loopEdge ? [loopEdge.target_node_id] : [],
      };
    }

    case 'join': {
      return {
        output: { _joined: true },
        nextNodeIds: outgoingEdges.map((e) => e.target_node_id),
      };
    }

    case 'human_checkpoint': {
      // Mark run as waiting for human action
      await workflowRunsRepo.update(run.id, {
        status: 'waiting',
        current_node_id: node.id,
      });

      return {
        output: {
          _checkpoint_node: node.id,
          _checkpoint_label: node.label,
          _waiting_since: new Date().toISOString(),
        },
        nextNodeIds: [], // will be resumed manually
      };
    }

    default: {
      // Domain nodes
      if (DOMAIN_NODE_TYPES.has(node.type)) {
        const domainOutput = await executeDomainNode(node.type, node.config, context);
        return {
          output: domainOutput,
          nextNodeIds: outgoingEdges.map((e) => e.target_node_id),
        };
      }

      throw new Error(`Unknown node type: "${node.type}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Domain node executor (stub)
// ---------------------------------------------------------------------------

export async function executeDomainNode(
  nodeType: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Dispatch to agent node executor if applicable
  if (isAgentNodeType(nodeType)) {
    const result = await executeAgentNode(nodeType as any, config, context);
    return { agent_result: result, executed: true, node_type: nodeType };
  }

  // Stub implementation — will be replaced with real service calls later
  return { executed: true, node_type: nodeType };
}

// ---------------------------------------------------------------------------
// Resume a waiting run
// ---------------------------------------------------------------------------

export async function resumeWaitingRun(
  runId: string,
  resumeData?: Record<string, unknown>,
): Promise<void> {
  const run = await workflowRunsRepo.findById(runId);
  if (!run) throw new Error('Workflow run not found');
  if (run.status !== 'waiting') throw new Error(`Cannot resume run: status is "${run.status}"`);

  const currentNodeId = run.current_node_id;
  if (!currentNodeId) throw new Error('No current node to resume from');

  const version = await workflowVersionsRepo.findById(run.workflow_version_id);
  if (!version) throw new Error('Workflow version not found');

  const graph: WorkflowGraphData = version.graph_data;
  const outgoingEdges = graph.edges
    .filter((e) => e.source_node_id === currentNodeId)
    .sort((a, b) => a.order - b.order);

  // Merge resume data into context
  const updatedContext = { ...run.context_data, ...(resumeData ?? {}) };
  await workflowRunsRepo.update(runId, {
    status: 'running',
    context_data: updatedContext,
  });

  // Execute the next nodes
  for (const edge of outgoingEdges) {
    await executeStep(runId, edge.target_node_id);
  }
}

// ---------------------------------------------------------------------------
// Cancel a run
// ---------------------------------------------------------------------------

export async function cancelRun(runId: string, userId?: string): Promise<void> {
  const run = await workflowRunsRepo.findById(runId);
  if (!run) throw new Error('Workflow run not found');
  if (run.status !== 'running' && run.status !== 'waiting') {
    throw new Error(`Cannot cancel run: status is "${run.status}"`);
  }

  await workflowRunsRepo.update(runId, {
    status: 'cancelled',
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: run.organization_id,
    actorType: userId ? 'user' : 'system',
    actorUserId: userId ?? undefined,
    action: 'workflow.run_cancelled',
    targetType: 'workflow_run',
    targetId: runId,
    metadata: { workflow_id: run.workflow_id },
  });
}

// ---------------------------------------------------------------------------
// Get run with steps
// ---------------------------------------------------------------------------

export async function getRunWithSteps(
  runId: string,
): Promise<{ run: WorkflowRun; steps: WorkflowRunStep[] } | null> {
  const run = await workflowRunsRepo.findById(runId);
  if (!run) return null;

  const steps = await workflowRunStepsRepo.findByRunId(runId);
  return { run, steps };
}

// ---------------------------------------------------------------------------
// Backward-compatible alias (used by workflow-actions.ts)
// ---------------------------------------------------------------------------

export async function startManualRun(
  workflowVersionId: string,
  orgId: string,
  userId: string,
  triggerPayload?: Record<string, unknown>,
): Promise<WorkflowRun> {
  return startWorkflowRun(
    workflowVersionId,
    orgId,
    'manual_trigger',
    triggerPayload ?? {},
    { initiatedByUserId: userId },
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function failRun(run: WorkflowRun, errorMessage: string): Promise<void> {
  await workflowRunsRepo.update(run.id, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: run.organization_id,
    actorType: 'system',
    action: 'workflow.run_failed',
    targetType: 'workflow_run',
    targetId: run.id,
    metadata: { workflow_id: run.workflow_id, error: errorMessage },
  });
}

/**
 * Simple expression evaluator.
 * Supports basic patterns like:
 *   "key === 'value'"
 *   "key > 10"
 *   "true" / "false"
 *
 * For safety, we avoid eval and use a simple matcher.
 */
function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  const trimmed = expression.trim();

  // Boolean literals
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Simple equality: "key === 'value'" or "key == 'value'"
  const eqMatch = trimmed.match(/^(\w[\w.]*)\s*={2,3}\s*['"](.*)['"]$/);
  if (eqMatch) {
    const value = resolveContextPath(eqMatch[1], context);
    return String(value) === eqMatch[2];
  }

  // Numeric comparisons: "key > 10", "key >= 10", "key < 10", "key <= 10"
  const numMatch = trimmed.match(/^(\w[\w.]*)\s*(>=|<=|>|<)\s*(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const value = Number(resolveContextPath(numMatch[1], context));
    const comparator = numMatch[2];
    const target = Number(numMatch[3]);
    if (isNaN(value)) return false;
    switch (comparator) {
      case '>': return value > target;
      case '>=': return value >= target;
      case '<': return value < target;
      case '<=': return value <= target;
    }
  }

  // Truthy check: just a context key
  const truthyMatch = trimmed.match(/^(\w[\w.]*)$/);
  if (truthyMatch) {
    return Boolean(resolveContextPath(truthyMatch[1], context));
  }

  return false;
}

function resolveContextPath(
  path: string,
  context: Record<string, unknown>,
): unknown {
  const parts = path.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
