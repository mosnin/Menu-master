import type {
  WorkflowGraphData,
  WorkflowTriggerEventType,
  WorkflowNodeType,
} from '@/types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'document'
    | 'closing'
    | 'listing'
    | 'offer'
    | 'compliance'
    | 'communication';
  trigger_event: WorkflowTriggerEventType;
  complexity: 'simple' | 'moderate' | 'complex';
  contains_agent_nodes: boolean;
  graph_data: WorkflowGraphData;
}

// ---------------------------------------------------------------------------
// Helper to build a node with sensible defaults
// ---------------------------------------------------------------------------
function node(
  id: string,
  type: WorkflowNodeType,
  label: string,
  position: { x: number; y: number },
  config: Record<string, unknown> = {},
): WorkflowGraphData['nodes'][number] {
  return {
    id,
    type,
    label,
    config,
    position,
    input_mapping: {},
    output_contract: {},
    retry_policy: null,
    timeout_ms: null,
  };
}

function edge(
  id: string,
  source_node_id: string,
  target_node_id: string,
  order: number,
  condition: string | null = null,
  label: string | null = null,
): WorkflowGraphData['edges'][number] {
  return { id, source_node_id, target_node_id, condition, label, order };
}

// ---------------------------------------------------------------------------
// 1. Document Upload Completeness
// ---------------------------------------------------------------------------
const docUploadCompleteness: WorkflowTemplate = {
  id: 'doc-upload-completeness',
  name: 'Document Upload Completeness',
  description:
    'When a document is uploaded, evaluate whether all required documents are present. If complete, log a timeline event; otherwise request the missing document and notify the responsible party.',
  category: 'document',
  trigger_event: 'document_uploaded',
  complexity: 'simple',
  contains_agent_nodes: false,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('eval-completeness', 'evaluate_transaction_completeness', 'Evaluate Transaction Completeness', { x: 250, y: 160 }),
      node('check-complete', 'condition', 'All docs complete?', { x: 250, y: 260 }, { expression: 'result.all_documents_complete === true' }),
      node('log-complete', 'create_timeline_event', 'Log Completion Event', { x: 100, y: 360 }),
      node('stop-complete', 'stop', 'Stop', { x: 100, y: 460 }),
      node('request-missing', 'request_missing_document', 'Request Missing Document', { x: 400, y: 360 }),
      node('notify-missing', 'create_notification', 'Notify Missing Document', { x: 400, y: 460 }),
      node('stop-missing', 'stop', 'Stop', { x: 400, y: 560 }),
    ],
    edges: [
      edge('e-start-eval', 'start', 'eval-completeness', 0),
      edge('e-eval-check', 'eval-completeness', 'check-complete', 1),
      edge('e-check-yes', 'check-complete', 'log-complete', 2, 'result === true', 'Yes'),
      edge('e-check-no', 'check-complete', 'request-missing', 3, 'result === false', 'No'),
      edge('e-log-stop', 'log-complete', 'stop-complete', 4),
      edge('e-request-notify', 'request-missing', 'notify-missing', 5),
      edge('e-notify-stop', 'notify-missing', 'stop-missing', 6),
    ],
    triggers: [{ event_type: 'document_uploaded', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// 2. Closing Readiness Reevaluation
// ---------------------------------------------------------------------------
const closingReadinessReeval: WorkflowTemplate = {
  id: 'closing-readiness-reeval',
  name: 'Closing Readiness Reevaluation',
  description:
    'When a transaction stage changes, reevaluate closing readiness. If ready, advance the stage and notify stakeholders. Otherwise recompute exceptions, create a checklist item, and notify.',
  category: 'closing',
  trigger_event: 'stage_changed',
  complexity: 'moderate',
  contains_agent_nodes: false,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('eval-closing', 'evaluate_closing_readiness', 'Evaluate Closing Readiness', { x: 250, y: 160 }),
      node('check-ready', 'condition', 'Ready to close?', { x: 250, y: 260 }, { expression: 'result.ready === true' }),
      node('transition-stage', 'transition_transaction_stage', 'Transition to Closing', { x: 100, y: 360 }),
      node('notify-ready', 'create_notification', 'Notify Closing Ready', { x: 100, y: 460 }),
      node('stop-ready', 'stop', 'Stop', { x: 100, y: 560 }),
      node('recompute-exceptions', 'recompute_exceptions', 'Recompute Exceptions', { x: 400, y: 360 }),
      node('create-checklist', 'create_checklist_item', 'Create Checklist Item', { x: 400, y: 460 }),
      node('notify-not-ready', 'create_notification', 'Notify Not Ready', { x: 400, y: 560 }),
      node('stop-not-ready', 'stop', 'Stop', { x: 400, y: 660 }),
    ],
    edges: [
      edge('e-start-eval', 'start', 'eval-closing', 0),
      edge('e-eval-check', 'eval-closing', 'check-ready', 1),
      edge('e-check-yes', 'check-ready', 'transition-stage', 2, 'result === true', 'Yes'),
      edge('e-check-no', 'check-ready', 'recompute-exceptions', 3, 'result === false', 'No'),
      edge('e-transition-notify', 'transition-stage', 'notify-ready', 4),
      edge('e-notify-ready-stop', 'notify-ready', 'stop-ready', 5),
      edge('e-recompute-checklist', 'recompute-exceptions', 'create-checklist', 6),
      edge('e-checklist-notify', 'create-checklist', 'notify-not-ready', 7),
      edge('e-notify-not-ready-stop', 'notify-not-ready', 'stop-not-ready', 8),
    ],
    triggers: [{ event_type: 'stage_changed', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// 3. Listing Launch Readiness
// ---------------------------------------------------------------------------
const listingLaunchReadiness: WorkflowTemplate = {
  id: 'listing-launch-readiness',
  name: 'Listing Launch Readiness',
  description:
    'After a checklist item is completed, evaluate listing readiness. If the score meets the threshold, transition the listing to "ready to launch" and notify. Otherwise send a "not ready" notification.',
  category: 'listing',
  trigger_event: 'stage_changed',
  complexity: 'moderate',
  contains_agent_nodes: false,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('eval-listing', 'evaluate_listing_readiness', 'Evaluate Listing Readiness', { x: 250, y: 160 }),
      node('check-score', 'condition', 'Score >= threshold?', { x: 250, y: 260 }, { expression: 'result.score >= result.threshold' }),
      node('transition-listing', 'transition_listing_stage', 'Transition to Ready to Launch', { x: 100, y: 360 }, { target_stage: 'ready_to_launch' }),
      node('notify-ready', 'create_notification', 'Listing ready', { x: 100, y: 460 }, { message: 'Listing ready' }),
      node('stop-ready', 'stop', 'Stop', { x: 100, y: 560 }),
      node('notify-not-ready', 'create_notification', 'Not ready yet', { x: 400, y: 360 }, { message: 'Not ready yet' }),
      node('stop-not-ready', 'stop', 'Stop', { x: 400, y: 460 }),
    ],
    edges: [
      edge('e-start-eval', 'start', 'eval-listing', 0),
      edge('e-eval-check', 'eval-listing', 'check-score', 1),
      edge('e-check-yes', 'check-score', 'transition-listing', 2, 'result === true', 'Yes'),
      edge('e-check-no', 'check-score', 'notify-not-ready', 3, 'result === false', 'No'),
      edge('e-transition-notify', 'transition-listing', 'notify-ready', 4),
      edge('e-notify-ready-stop', 'notify-ready', 'stop-ready', 5),
      edge('e-notify-not-ready-stop', 'notify-not-ready', 'stop-not-ready', 6),
    ],
    triggers: [{ event_type: 'stage_changed', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// 4. Accepted Offer Handoff
// ---------------------------------------------------------------------------
const acceptedOfferHandoff: WorkflowTemplate = {
  id: 'accepted-offer-handoff',
  name: 'Accepted Offer Handoff',
  description:
    'When an offer status changes, check if the offer was accepted. If so, execute the full handoff sequence: transfer offer data, notify, evaluate completeness, pause for human review, advance the transaction stage, and log a timeline event.',
  category: 'offer',
  trigger_event: 'offer_accepted',
  complexity: 'complex',
  contains_agent_nodes: false,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('check-accepted', 'condition', 'Offer accepted?', { x: 250, y: 160 }, { expression: 'trigger.offer_status === "accepted"' }),
      node('stop-rejected', 'stop', 'Stop', { x: 450, y: 260 }),
      node('handoff', 'handoff_accepted_offer', 'Handoff Accepted Offer', { x: 250, y: 260 }),
      node('notify-handoff', 'create_notification', 'Handoff started', { x: 250, y: 360 }, { message: 'Handoff started' }),
      node('eval-completeness', 'evaluate_transaction_completeness', 'Evaluate Transaction Completeness', { x: 250, y: 460 }),
      node('human-review', 'human_checkpoint', 'Review handoff', { x: 250, y: 560 }, { prompt: 'Review handoff' }),
      node('transition-stage', 'transition_transaction_stage', 'Transition Transaction Stage', { x: 250, y: 660 }),
      node('log-event', 'create_timeline_event', 'Log Handoff Complete', { x: 250, y: 760 }),
      node('stop-done', 'stop', 'Stop', { x: 250, y: 860 }),
    ],
    edges: [
      edge('e-start-check', 'start', 'check-accepted', 0),
      edge('e-check-no', 'check-accepted', 'stop-rejected', 1, 'result === false', 'No'),
      edge('e-check-yes', 'check-accepted', 'handoff', 2, 'result === true', 'Yes'),
      edge('e-handoff-notify', 'handoff', 'notify-handoff', 3),
      edge('e-notify-eval', 'notify-handoff', 'eval-completeness', 4),
      edge('e-eval-human', 'eval-completeness', 'human-review', 5),
      edge('e-human-transition', 'human-review', 'transition-stage', 6),
      edge('e-transition-log', 'transition-stage', 'log-event', 7),
      edge('e-log-stop', 'log-event', 'stop-done', 8),
    ],
    triggers: [{ event_type: 'offer_accepted', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// 5. Compliance Escalation
// ---------------------------------------------------------------------------
const complianceEscalation: WorkflowTemplate = {
  id: 'compliance-escalation',
  name: 'Compliance Escalation',
  description:
    'When an exception is created, use the AI triage classifier to determine severity. If escalation is required, pause for human compliance review, create an approval request, and notify. Otherwise log a timeline event.',
  category: 'compliance',
  trigger_event: 'exception_created',
  complexity: 'moderate',
  contains_agent_nodes: true,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('agent-triage', 'agent_exception_triage_classifier', 'AI Exception Triage', { x: 250, y: 160 }),
      node('check-escalation', 'condition', 'Requires escalation?', { x: 250, y: 260 }, { expression: 'result.requires_escalation === true' }),
      node('human-review', 'human_checkpoint', 'Compliance review', { x: 100, y: 360 }, { prompt: 'Compliance review' }),
      node('create-approval', 'create_approval', 'Create Approval', { x: 100, y: 460 }),
      node('notify-escalated', 'create_notification', 'Notify Escalation', { x: 100, y: 560 }),
      node('stop-escalated', 'stop', 'Stop', { x: 100, y: 660 }),
      node('log-event', 'create_timeline_event', 'Log Triage Result', { x: 400, y: 360 }),
      node('stop-no-escalation', 'stop', 'Stop', { x: 400, y: 460 }),
    ],
    edges: [
      edge('e-start-agent', 'start', 'agent-triage', 0),
      edge('e-agent-check', 'agent-triage', 'check-escalation', 1),
      edge('e-check-yes', 'check-escalation', 'human-review', 2, 'result === true', 'Yes'),
      edge('e-check-no', 'check-escalation', 'log-event', 3, 'result === false', 'No'),
      edge('e-human-approval', 'human-review', 'create-approval', 4),
      edge('e-approval-notify', 'create-approval', 'notify-escalated', 5),
      edge('e-notify-stop', 'notify-escalated', 'stop-escalated', 6),
      edge('e-log-stop', 'log-event', 'stop-no-escalation', 7),
    ],
    triggers: [{ event_type: 'exception_created', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// 6. Digest Generation
// ---------------------------------------------------------------------------
const digestGeneration: WorkflowTemplate = {
  id: 'digest-generation',
  name: 'Digest Generation',
  description:
    'Manually triggered workflow that recomputes the health score for a transaction, sends a digest email, and logs a timeline event.',
  category: 'communication',
  trigger_event: 'manual_trigger',
  complexity: 'simple',
  contains_agent_nodes: false,
  graph_data: {
    nodes: [
      node('start', 'start', 'Start', { x: 250, y: 60 }),
      node('recompute-health', 'recompute_health_score', 'Recompute Health Score', { x: 250, y: 160 }),
      node('send-digest', 'send_digest', 'Send Digest', { x: 250, y: 260 }),
      node('log-event', 'create_timeline_event', 'Log Digest Sent', { x: 250, y: 360 }),
      node('stop', 'stop', 'Stop', { x: 250, y: 460 }),
    ],
    edges: [
      edge('e-start-recompute', 'start', 'recompute-health', 0),
      edge('e-recompute-digest', 'recompute-health', 'send-digest', 1),
      edge('e-digest-log', 'send-digest', 'log-event', 2),
      edge('e-log-stop', 'log-event', 'stop', 3),
    ],
    triggers: [{ event_type: 'manual_trigger', event_filter: {} }],
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  docUploadCompleteness,
  closingReadinessReeval,
  listingLaunchReadiness,
  acceptedOfferHandoff,
  complianceEscalation,
  digestGeneration,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
