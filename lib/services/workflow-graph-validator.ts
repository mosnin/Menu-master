import type { WorkflowGraphData, WorkflowNodeType } from '@/types';

// ---------------------------------------------------------------------------
// Valid node types (mirrors the WorkflowNodeType union in @/types)
// ---------------------------------------------------------------------------

export const VALID_NODE_TYPES = new Set<string>([
  'start',
  'stop',
  'condition',
  'branch',
  'wait',
  'loop',
  'join',
  'human_checkpoint',
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
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Graph validator
// ---------------------------------------------------------------------------

export function validateWorkflowGraph(graph: WorkflowGraphData): ValidationResult {
  const errors: ValidationError[] = [];
  const { nodes, edges } = graph;

  const nodeIds = new Set(nodes.map((n) => n.id));

  // 1. Must have exactly one 'start' node
  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({ code: 'NO_START_NODE', message: 'Workflow must have exactly one start node' });
  } else if (startNodes.length > 1) {
    errors.push({ code: 'MULTIPLE_START_NODES', message: `Workflow must have exactly one start node, found ${startNodes.length}` });
  }

  // 2. Must have at least one 'stop' node
  const stopNodes = nodes.filter((n) => n.type === 'stop');
  if (stopNodes.length === 0) {
    errors.push({ code: 'NO_STOP_NODE', message: 'Workflow must have at least one stop node' });
  }

  // 3. All edges must reference existing node IDs
  for (const edge of edges) {
    if (!nodeIds.has(edge.source_node_id)) {
      errors.push({
        edgeId: edge.id,
        code: 'INVALID_EDGE_SOURCE',
        message: `Edge "${edge.id}" references non-existent source node "${edge.source_node_id}"`,
      });
    }
    if (!nodeIds.has(edge.target_node_id)) {
      errors.push({
        edgeId: edge.id,
        code: 'INVALID_EDGE_TARGET',
        message: `Edge "${edge.id}" references non-existent target node "${edge.target_node_id}"`,
      });
    }
  }

  // 5. All nodes must have a valid type
  for (const node of nodes) {
    if (!VALID_NODE_TYPES.has(node.type)) {
      errors.push({
        nodeId: node.id,
        code: 'INVALID_NODE_TYPE',
        message: `Node "${node.id}" has invalid type "${node.type}"`,
      });
    }
  }

  // 6. Loop nodes must have config.max_iterations and config.exit_condition
  for (const node of nodes) {
    if (node.type === 'loop') {
      const maxIter = node.config.max_iterations;
      if (typeof maxIter !== 'number' || maxIter <= 0 || maxIter > 100) {
        errors.push({
          nodeId: node.id,
          code: 'LOOP_INVALID_MAX_ITERATIONS',
          message: `Loop node "${node.id}" must have config.max_iterations as a number > 0 and <= 100`,
        });
      }
      if (typeof node.config.exit_condition !== 'string' || !node.config.exit_condition) {
        errors.push({
          nodeId: node.id,
          code: 'LOOP_MISSING_EXIT_CONDITION',
          message: `Loop node "${node.id}" must have config.exit_condition as a non-empty string`,
        });
      }
    }
  }

  // 7. Wait nodes must have config.wait_type and either duration_ms or event_type
  for (const node of nodes) {
    if (node.type === 'wait') {
      const waitType = node.config.wait_type;
      if (waitType !== 'time' && waitType !== 'event') {
        errors.push({
          nodeId: node.id,
          code: 'WAIT_INVALID_TYPE',
          message: `Wait node "${node.id}" must have config.wait_type of "time" or "event"`,
        });
      } else if (waitType === 'time' && !node.config.duration_ms) {
        errors.push({
          nodeId: node.id,
          code: 'WAIT_MISSING_DURATION',
          message: `Wait node "${node.id}" with wait_type "time" must have config.duration_ms`,
        });
      } else if (waitType === 'event' && !node.config.event_type) {
        errors.push({
          nodeId: node.id,
          code: 'WAIT_MISSING_EVENT_TYPE',
          message: `Wait node "${node.id}" with wait_type "event" must have config.event_type`,
        });
      }
    }
  }

  // 8. No self-loops
  for (const edge of edges) {
    if (edge.source_node_id === edge.target_node_id) {
      errors.push({
        edgeId: edge.id,
        code: 'SELF_LOOP',
        message: `Edge "${edge.id}" is a self-loop (source and target are the same node)`,
      });
    }
  }

  // 9. Condition/branch nodes must have at least 2 outgoing edges
  for (const node of nodes) {
    if (node.type === 'condition' || node.type === 'branch') {
      const outgoing = edges.filter((e) => e.source_node_id === node.id);
      if (outgoing.length < 2) {
        errors.push({
          nodeId: node.id,
          code: 'BRANCH_INSUFFICIENT_EDGES',
          message: `${node.type} node "${node.id}" must have at least 2 outgoing edges, found ${outgoing.length}`,
        });
      }
    }
  }

  // 10. Start node must have no incoming edges
  for (const startNode of startNodes) {
    const incoming = edges.filter((e) => e.target_node_id === startNode.id);
    if (incoming.length > 0) {
      errors.push({
        nodeId: startNode.id,
        code: 'START_HAS_INCOMING_EDGES',
        message: `Start node "${startNode.id}" must not have incoming edges`,
      });
    }
  }

  // 4. No unreachable nodes (every non-start node must be reachable from start via edges)
  if (startNodes.length === 1) {
    const reachable = new Set<string>();
    const queue = [startNodes[0].id];
    reachable.add(startNodes[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges) {
        if (edge.source_node_id === current && !reachable.has(edge.target_node_id)) {
          reachable.add(edge.target_node_id);
          queue.push(edge.target_node_id);
        }
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push({
          nodeId: node.id,
          code: 'UNREACHABLE_NODE',
          message: `Node "${node.id}" is not reachable from the start node`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
