import type { WorkflowGraphData, WorkflowNode } from '@/types';
import type { WorkflowAuthoringIntent } from '@/lib/validation/workflow-authoring';
import { validateWorkflowGraph } from '@/lib/services/workflow-graph-validator';

interface MappingMetadata {
  assumptions: string[];
  warnings: string[];
  missingInformation: string[];
  unsupportedRequests: string[];
  explanation: string[];
}

export interface WorkflowDraftGenerationResult {
  graphData: WorkflowGraphData;
  metadata: MappingMetadata;
  validation: ReturnType<typeof validateWorkflowGraph>;
}

const ACTION_TO_NODE: Record<WorkflowAuthoringIntent['actions'][number]['kind'], WorkflowNode['type']> = {
  create_notification: 'create_notification',
  create_checklist_item: 'create_checklist_item',
  request_manual_review: 'human_checkpoint',
  create_approval_request: 'create_approval',
  create_reminder_draft: 'create_notification',
  recompute_readiness: 'evaluate_listing_readiness',
  recompute_completeness: 'evaluate_transaction_completeness',
  update_waiting_state: 'wait',
  unsupported: 'create_notification',
};

export function mapAuthoringIntentToGraph(intent: WorkflowAuthoringIntent): WorkflowDraftGenerationResult {
  const nodes: WorkflowNode[] = [
    createNode('start-node', 'start', 'Start', 260, 60, {}),
  ];

  const explanation: string[] = [];
  const warnings = intent.ambiguities.map((x) => x.message);

  let y = 160;
  let previousNodeId = 'start-node';
  const edges: WorkflowGraphData['edges'] = [];

  for (const action of intent.actions) {
    const nodeType = ACTION_TO_NODE[action.kind];
    const nodeId = `node-${action.id}`;
    const node = createNode(nodeId, nodeType, action.label, 260, y, {});
    nodes.push(node);
    edges.push(createEdge(previousNodeId, nodeId, edges.length));
    previousNodeId = nodeId;
    y += 110;
    explanation.push(`Then ${action.label.toLowerCase()}.`);
  }

  for (const waitStep of intent.waits) {
    const nodeId = `node-${waitStep.id}`;
    const config = waitStep.mode === 'duration'
      ? { wait_type: 'time', duration_ms: (waitStep.durationHours ?? 24) * 60 * 60 * 1000 }
      : { wait_type: 'event', event_type: waitStep.eventType ?? 'approval_decided' };
    nodes.push(createNode(nodeId, 'wait', 'Wait', 260, y, config));
    edges.push(createEdge(previousNodeId, nodeId, edges.length));
    previousNodeId = nodeId;
    y += 110;
    explanation.push(`Wait step inferred from: ${waitStep.sourceText}.`);
  }

  if (intent.escalations.length > 0) {
    const nodeId = 'node-escalation';
    nodes.push(createNode(nodeId, 'create_notification', 'Escalation notification', 260, y, { priority: 'high' }));
    edges.push(createEdge(previousNodeId, nodeId, edges.length));
    previousNodeId = nodeId;
    y += 110;
    explanation.push('Escalation path was inferred and mapped to notification for admin review.');
  }

  nodes.push(createNode('stop-node', 'stop', 'Stop', 260, y, {}));
  edges.push(createEdge(previousNodeId, 'stop-node', edges.length));

  if (intent.conditions.length > 0) {
    warnings.push('Conditional logic was captured as text and should be modeled with branch nodes in the builder.');
  }

  const graphData: WorkflowGraphData = {
    nodes,
    edges,
    triggers: [mapTrigger(intent.trigger)],
  };

  const validation = validateWorkflowGraph(graphData);

  return {
    graphData,
    metadata: {
      assumptions: intent.assumptions,
      warnings,
      missingInformation: intent.missingInformation,
      unsupportedRequests: intent.unsupportedRequests,
      explanation: [triggerExplanation(intent), ...explanation],
    },
    validation,
  };
}

function mapTrigger(trigger: WorkflowAuthoringIntent['trigger']): WorkflowGraphData['triggers'][number] {
  switch (trigger.type) {
    case 'document_uploaded':
      return { event_type: 'document_uploaded', event_filter: {} };
    case 'transaction_enters_financing':
      return { event_type: 'stage_changed', event_filter: { to_stage: 'financing' } };
    case 'listing_launch_blocked':
      return { event_type: 'exception_created', event_filter: { listing_state: 'launch_blocked' } };
    case 'approval_pending_too_long':
      return { event_type: 'approval_decided', event_filter: { status: 'pending_timeout' } };
    case 'scheduled':
      return { event_type: 'scheduled_trigger', event_filter: { cron: trigger.schedule ?? '0 9 * * *' } };
    case 'unknown':
    default:
      return { event_type: 'manual_trigger', event_filter: { needs_configuration: true } };
  }
}

function triggerExplanation(intent: WorkflowAuthoringIntent): string {
  switch (intent.trigger.type) {
    case 'document_uploaded':
      return 'Starts when a document is uploaded.';
    case 'transaction_enters_financing':
      return 'Starts when a transaction enters financing stage.';
    case 'listing_launch_blocked':
      return 'Starts when a listing becomes launch blocked.';
    case 'scheduled':
      return `Runs on a schedule (${intent.trigger.schedule ?? '0 9 * * *'}).`;
    default:
      return 'Trigger was unclear; draft uses manual trigger placeholder.';
  }
}

function createEdge(sourceNodeId: string, targetNodeId: string, order: number) {
  return {
    id: `edge-${sourceNodeId}-${targetNodeId}-${order}`,
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    condition: null,
    label: null,
    order,
  };
}

function createNode(
  id: string,
  type: WorkflowNode['type'],
  label: string,
  x: number,
  y: number,
  config: Record<string, unknown>,
): WorkflowNode {
  return {
    id,
    type,
    label,
    config,
    position: { x, y },
    input_mapping: {},
    output_contract: {},
    retry_policy: null,
    timeout_ms: null,
  };
}
