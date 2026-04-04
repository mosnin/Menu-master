import { describe, it, expect } from 'vitest';

import {
  validateWorkflowGraph,
  VALID_NODE_TYPES,
} from '@/lib/services/workflow-graph-validator';

import type { WorkflowGraphData, WorkflowNode, WorkflowEdge } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<WorkflowNode> & { id: string; type: string }): WorkflowNode {
  return {
    label: overrides.type,
    config: {},
    position: { x: 0, y: 0 },
    input_mapping: {},
    output_contract: {},
    retry_policy: null,
    timeout_ms: null,
    ...overrides,
  } as WorkflowNode;
}

function makeEdge(
  source: string,
  target: string,
  overrides?: Partial<WorkflowEdge>,
): WorkflowEdge {
  return {
    id: `${source}->${target}`,
    source_node_id: source,
    target_node_id: target,
    condition: null,
    label: null,
    order: 0,
    ...overrides,
  };
}

function graph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowGraphData {
  return { nodes, edges, triggers: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workflow Graph Validator', () => {
  // 1. valid simple graph (start -> stop) passes validation
  it('accepts a valid simple graph (start -> stop)', () => {
    const g = graph(
      [makeNode({ id: 'n1', type: 'start' }), makeNode({ id: 'n2', type: 'stop' })],
      [makeEdge('n1', 'n2')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // 2. graph without start node fails
  it('rejects a graph without a start node', () => {
    const g = graph(
      [makeNode({ id: 'n1', type: 'stop' })],
      [],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'NO_START_NODE')).toBe(true);
  });

  // 3. graph without stop node fails
  it('rejects a graph without a stop node', () => {
    const g = graph(
      [makeNode({ id: 'n1', type: 'start' })],
      [],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'NO_STOP_NODE')).toBe(true);
  });

  // 4. graph with unreachable node fails
  it('rejects a graph with an unreachable node', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'stop' }),
        makeNode({ id: 'n3', type: 'create_notification' }),
      ],
      [makeEdge('n1', 'n2')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNREACHABLE_NODE' && e.nodeId === 'n3')).toBe(true);
  });

  // 5. graph with self-loop edge fails
  it('rejects a graph with a self-loop edge', () => {
    const g = graph(
      [makeNode({ id: 'n1', type: 'start' }), makeNode({ id: 'n2', type: 'stop' })],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n2', { id: 'self' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SELF_LOOP')).toBe(true);
  });

  // 6. graph with unknown node type fails
  it('rejects a graph with an unknown node type', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'banana' as any }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NODE_TYPE')).toBe(true);
  });

  // 7. loop node without max_iterations fails
  it('rejects a loop node without max_iterations', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'loop', config: { exit_condition: 'done' } }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'LOOP_INVALID_MAX_ITERATIONS')).toBe(true);
  });

  // 8. loop node with max_iterations > 100 fails
  it('rejects a loop node with max_iterations > 100', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'loop', config: { max_iterations: 101, exit_condition: 'done' } }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'LOOP_INVALID_MAX_ITERATIONS')).toBe(true);
  });

  // 9. wait node without wait_type fails
  it('rejects a wait node without wait_type', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'wait', config: {} }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'WAIT_INVALID_TYPE')).toBe(true);
  });

  // 10. condition node with < 2 outgoing edges fails
  it('rejects a condition node with fewer than 2 outgoing edges', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({ id: 'n2', type: 'condition' }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'BRANCH_INSUFFICIENT_EDGES')).toBe(true);
  });

  // 11. start node with incoming edges fails
  it('rejects a start node that has incoming edges', () => {
    const g = graph(
      [makeNode({ id: 'n1', type: 'start' }), makeNode({ id: 'n2', type: 'stop' })],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n1', { id: 'back' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'START_HAS_INCOMING_EDGES')).toBe(true);
  });

  // 12. valid complex graph (start -> condition -> branch1/branch2 -> stop) passes
  it('accepts a valid complex graph with condition branching', () => {
    const g = graph(
      [
        makeNode({ id: 'start', type: 'start' }),
        makeNode({ id: 'cond', type: 'condition' }),
        makeNode({ id: 'b1', type: 'create_notification' }),
        makeNode({ id: 'b2', type: 'create_approval' }),
        makeNode({ id: 'end', type: 'stop' }),
      ],
      [
        makeEdge('start', 'cond'),
        makeEdge('cond', 'b1', { id: 'cond->b1', condition: 'price > 1000000' }),
        makeEdge('cond', 'b2', { id: 'cond->b2', condition: 'else' }),
        makeEdge('b1', 'end', { id: 'b1->end' }),
        makeEdge('b2', 'end', { id: 'b2->end' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // 13. VALID_NODE_TYPES includes at least 15 domain nodes
  it('VALID_NODE_TYPES includes at least 15 node types', () => {
    expect(VALID_NODE_TYPES.size).toBeGreaterThanOrEqual(15);
    // Verify key domain types are present
    expect(VALID_NODE_TYPES.has('start')).toBe(true);
    expect(VALID_NODE_TYPES.has('stop')).toBe(true);
    expect(VALID_NODE_TYPES.has('condition')).toBe(true);
    expect(VALID_NODE_TYPES.has('wait')).toBe(true);
    expect(VALID_NODE_TYPES.has('loop')).toBe(true);
    expect(VALID_NODE_TYPES.has('join')).toBe(true);
    expect(VALID_NODE_TYPES.has('human_checkpoint')).toBe(true);
    expect(VALID_NODE_TYPES.has('create_notification')).toBe(true);
    expect(VALID_NODE_TYPES.has('create_approval')).toBe(true);
    expect(VALID_NODE_TYPES.has('recompute_health_score')).toBe(true);
    expect(VALID_NODE_TYPES.has('emit_webhook')).toBe(true);
    expect(VALID_NODE_TYPES.has('send_digest')).toBe(true);
    expect(VALID_NODE_TYPES.has('transition_transaction_stage')).toBe(true);
    expect(VALID_NODE_TYPES.has('evaluate_transaction_completeness')).toBe(true);
    expect(VALID_NODE_TYPES.has('handoff_accepted_offer')).toBe(true);
  });

  // 14. loop with valid config passes
  it('accepts a loop node with valid config', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({
          id: 'n2',
          type: 'loop',
          config: { max_iterations: 10, exit_condition: 'items.length === 0' },
        }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });

  // 15. wait with valid time config passes
  it('accepts a wait node with valid time config', () => {
    const g = graph(
      [
        makeNode({ id: 'n1', type: 'start' }),
        makeNode({
          id: 'n2',
          type: 'wait',
          config: { wait_type: 'time', duration_ms: 30000 },
        }),
        makeNode({ id: 'n3', type: 'stop' }),
      ],
      [makeEdge('n1', 'n2'), makeEdge('n2', 'n3')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });
});
