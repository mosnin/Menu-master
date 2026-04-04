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
// Graph Structure Tests
// ---------------------------------------------------------------------------

describe('Workflow Builder – Graph Structure', () => {
  // 1. empty graph (no nodes, no edges) fails validation
  it('rejects an empty graph with no nodes and no edges', () => {
    const result = validateWorkflowGraph(graph([], []));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'NO_START_NODE')).toBe(true);
    expect(result.errors.some((e) => e.code === 'NO_STOP_NODE')).toBe(true);
  });

  // 2. single start + single stop + one edge = valid
  it('accepts a minimal valid graph: start → stop', () => {
    const g = graph(
      [makeNode({ id: 's', type: 'start' }), makeNode({ id: 'e', type: 'stop' })],
      [makeEdge('s', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // 3. multiple start nodes fails
  it('rejects a graph with multiple start nodes', () => {
    const g = graph(
      [
        makeNode({ id: 's1', type: 'start' }),
        makeNode({ id: 's2', type: 'start' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s1', 'e'), makeEdge('s2', 'e', { id: 's2->e' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MULTIPLE_START_NODES')).toBe(true);
  });

  // 4. start node with incoming edges fails
  it('rejects a start node that has incoming edges', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'a', type: 'create_notification' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'a'), makeEdge('a', 's', { id: 'a->s' }), makeEdge('a', 'e', { id: 'a->e' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'START_HAS_INCOMING_EDGES')).toBe(true);
  });

  // 5. edge referencing non-existent source node fails
  it('rejects an edge whose source node does not exist', () => {
    const g = graph(
      [makeNode({ id: 's', type: 'start' }), makeNode({ id: 'e', type: 'stop' })],
      [makeEdge('s', 'e'), makeEdge('ghost', 'e', { id: 'ghost->e' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_EDGE_SOURCE')).toBe(true);
  });

  // 6. edge referencing non-existent target node fails
  it('rejects an edge whose target node does not exist', () => {
    const g = graph(
      [makeNode({ id: 's', type: 'start' }), makeNode({ id: 'e', type: 'stop' })],
      [makeEdge('s', 'e'), makeEdge('s', 'ghost', { id: 's->ghost' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_EDGE_TARGET')).toBe(true);
  });

  // 7. disconnected subgraph (node not reachable from start) fails
  it('rejects a graph with an unreachable node (disconnected subgraph)', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'e', type: 'stop' }),
        makeNode({ id: 'orphan', type: 'create_notification' }),
        makeNode({ id: 'orphan2', type: 'create_checklist_item' }),
      ],
      [
        makeEdge('s', 'e'),
        makeEdge('orphan', 'orphan2', { id: 'orphan->orphan2' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    const unreachable = result.errors.filter((e) => e.code === 'UNREACHABLE_NODE');
    expect(unreachable).toHaveLength(2);
    expect(unreachable.map((e) => e.nodeId).sort()).toEqual(['orphan', 'orphan2']);
  });

  // 8. self-loop edge fails
  it('rejects a self-loop edge', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'a', type: 'create_notification' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'a'), makeEdge('a', 'a', { id: 'self' }), makeEdge('a', 'e', { id: 'a->e' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SELF_LOOP' && e.edgeId === 'self')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Control Flow Tests
// ---------------------------------------------------------------------------

describe('Workflow Builder – Control Flow', () => {
  // 9. condition node with 0 outgoing edges fails
  it('rejects a condition node with 0 outgoing edges', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'c', type: 'condition' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'c'), makeEdge('s', 'e', { id: 's->e' })],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'BRANCH_INSUFFICIENT_EDGES' && e.nodeId === 'c')).toBe(true);
  });

  // 10. condition node with 1 outgoing edge fails
  it('rejects a condition node with only 1 outgoing edge', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'c', type: 'condition' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'c'), makeEdge('c', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'BRANCH_INSUFFICIENT_EDGES')).toBe(true);
  });

  // 11. condition node with 2+ outgoing edges passes
  it('accepts a condition node with 2 outgoing edges', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'c', type: 'condition' }),
        makeNode({ id: 'a', type: 'create_notification' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [
        makeEdge('s', 'c'),
        makeEdge('c', 'a', { id: 'c->a', condition: 'score < 70' }),
        makeEdge('c', 'e', { id: 'c->e', condition: 'else' }),
        makeEdge('a', 'e', { id: 'a->e' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });

  // 12. branch node with 2+ outgoing edges passes
  it('accepts a branch node with 2 outgoing edges', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'b', type: 'branch' }),
        makeNode({ id: 'p1', type: 'create_notification' }),
        makeNode({ id: 'p2', type: 'create_approval' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [
        makeEdge('s', 'b'),
        makeEdge('b', 'p1', { id: 'b->p1' }),
        makeEdge('b', 'p2', { id: 'b->p2' }),
        makeEdge('p1', 'e', { id: 'p1->e' }),
        makeEdge('p2', 'e', { id: 'p2->e' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });

  // 13. loop node without max_iterations in config fails
  it('rejects a loop node without max_iterations', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'l', type: 'loop', config: { exit_condition: 'done' } }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'l'), makeEdge('l', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'LOOP_INVALID_MAX_ITERATIONS')).toBe(true);
  });

  // 14. loop node with max_iterations = 0 fails
  it('rejects a loop node with max_iterations = 0', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'l', type: 'loop', config: { max_iterations: 0, exit_condition: 'done' } }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'l'), makeEdge('l', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'LOOP_INVALID_MAX_ITERATIONS')).toBe(true);
  });

  // 15. loop node with max_iterations = 101 fails
  it('rejects a loop node with max_iterations = 101', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'l', type: 'loop', config: { max_iterations: 101, exit_condition: 'done' } }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'l'), makeEdge('l', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'LOOP_INVALID_MAX_ITERATIONS')).toBe(true);
  });

  // 16. loop node with max_iterations = 50 and exit_condition passes
  it('accepts a loop node with max_iterations = 50 and valid exit_condition', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({
          id: 'l',
          type: 'loop',
          config: { max_iterations: 50, exit_condition: 'items.length === 0' },
        }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'l'), makeEdge('l', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });

  // 17. wait node without wait_type fails
  it('rejects a wait node without wait_type', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'w', type: 'wait', config: {} }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'w'), makeEdge('w', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'WAIT_INVALID_TYPE')).toBe(true);
  });

  // 18. wait node with wait_type='time' and duration_ms passes
  it('accepts a wait node with wait_type=time and duration_ms', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'w', type: 'wait', config: { wait_type: 'time', duration_ms: 60000 } }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'w'), makeEdge('w', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });

  // 19. wait node with wait_type='event' and event_type passes
  it('accepts a wait node with wait_type=event and event_type', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'w', type: 'wait', config: { wait_type: 'event', event_type: 'approval_decided' } }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'w'), makeEdge('w', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Domain Node Tests
// ---------------------------------------------------------------------------

describe('Workflow Builder – Domain Nodes', () => {
  const expectedDomainTypes = [
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
  ];

  // 20. all 15 domain node types are in VALID_NODE_TYPES
  it('VALID_NODE_TYPES contains all 15 domain node types', () => {
    for (const t of expectedDomainTypes) {
      expect(VALID_NODE_TYPES.has(t)).toBe(true);
    }
    expect(expectedDomainTypes).toHaveLength(15);
  });

  // 21. node with type 'invalid_custom_node' fails validation
  it('rejects a node with type invalid_custom_node', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'bad', type: 'invalid_custom_node' as any }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'bad'), makeEdge('bad', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NODE_TYPE' && e.nodeId === 'bad')).toBe(true);
  });

  // 22. human_checkpoint node is valid
  it('accepts a graph containing a human_checkpoint node', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'hc', type: 'human_checkpoint' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'hc'), makeEdge('hc', 'e')],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Complex Graph Tests
// ---------------------------------------------------------------------------

describe('Workflow Builder – Complex Graphs', () => {
  // 23. start → condition → (branch_a → stop, branch_b → stop) = valid
  it('accepts: start → condition → (branch_a → stop1, branch_b → stop2)', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'c', type: 'condition' }),
        makeNode({ id: 'ba', type: 'create_notification' }),
        makeNode({ id: 'bb', type: 'create_approval' }),
        makeNode({ id: 'e1', type: 'stop' }),
        makeNode({ id: 'e2', type: 'stop' }),
      ],
      [
        makeEdge('s', 'c'),
        makeEdge('c', 'ba', { id: 'c->ba', condition: 'score < 70' }),
        makeEdge('c', 'bb', { id: 'c->bb', condition: 'else' }),
        makeEdge('ba', 'e1', { id: 'ba->e1' }),
        makeEdge('bb', 'e2', { id: 'bb->e2' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // 24. start → loop → domain_node → loop_back → stop = valid (with valid loop config)
  it('accepts: start → loop → domain → back-edge → stop', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({
          id: 'l',
          type: 'loop',
          config: { max_iterations: 10, exit_condition: 'retries_exhausted' },
        }),
        makeNode({ id: 'd', type: 'request_missing_document' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [
        makeEdge('s', 'l'),
        makeEdge('l', 'd', { id: 'l->d' }),
        makeEdge('d', 'l', { id: 'd->l' }),
        makeEdge('l', 'e', { id: 'l->e' }),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // 25. start → wait → human_checkpoint → stop = valid
  it('accepts: start → wait(event) → human_checkpoint → stop', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({
          id: 'w',
          type: 'wait',
          config: { wait_type: 'event', event_type: 'document_uploaded' },
        }),
        makeNode({ id: 'hc', type: 'human_checkpoint' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [
        makeEdge('s', 'w'),
        makeEdge('w', 'hc'),
        makeEdge('hc', 'e'),
      ],
    );
    const result = validateWorkflowGraph(g);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
