import { describe, it, expect } from 'vitest';

import {
  WORKFLOW_TEMPLATES,
  getTemplateById,
} from '@/lib/workflow-templates/index';
import type { WorkflowTemplate } from '@/lib/workflow-templates/index';

import { getPublishWarnings } from '@/lib/services/workflow-publish-service';

import { compareWorkflowVersions } from '@/lib/services/workflow-diff-service';

import { VALID_NODE_TYPES } from '@/lib/services/workflow-graph-validator';

import type { WorkflowGraphData, WorkflowNode, WorkflowEdge } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  overrides: Partial<WorkflowNode> & { id: string; type: string },
): WorkflowNode {
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
  triggers: WorkflowGraphData['triggers'] = [],
): WorkflowGraphData {
  return { nodes, edges, triggers };
}

// ---------------------------------------------------------------------------
// Group 1: Workflow Template Library
// ---------------------------------------------------------------------------

describe('Workflow Template Library', () => {
  it('contains exactly 6 templates', () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(6);
  });

  it('all templates have unique ids', () => {
    const ids = WORKFLOW_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all templates have valid graph data (nodes, edges, triggers arrays)', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(Array.isArray(template.graph_data.nodes)).toBe(true);
      expect(Array.isArray(template.graph_data.edges)).toBe(true);
      expect(Array.isArray(template.graph_data.triggers)).toBe(true);
    }
  });

  it('all templates have at least one start and one stop node', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      const { nodes } = template.graph_data;
      const hasStart = nodes.some((n) => n.type === 'start');
      const hasStop = nodes.some((n) => n.type === 'stop');
      expect(hasStart).toBe(true);
      expect(hasStop).toBe(true);
    }
  });

  it('all template node types are in VALID_NODE_TYPES', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      for (const node of template.graph_data.nodes) {
        expect(VALID_NODE_TYPES.has(node.type)).toBe(true);
      }
    }
  });

  it('compliance escalation template contains agent nodes', () => {
    const template = getTemplateById('compliance-escalation');
    expect(template).toBeDefined();
    expect(template!.contains_agent_nodes).toBe(true);
    const agentNodes = template!.graph_data.nodes.filter((n) =>
      n.type.startsWith('agent_'),
    );
    expect(agentNodes.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Publish Governance
// ---------------------------------------------------------------------------

describe('Publish Governance', () => {
  it('returns warning for agent nodes', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'a', type: 'agent_deal_router' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'a'), makeEdge('a', 'e')],
    );
    const warnings = getPublishWarnings(g);
    expect(warnings.some((w) => w.includes('AI agent nodes'))).toBe(true);
  });

  it('returns warning for stage transition nodes', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 't', type: 'transition_transaction_stage' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 't'), makeEdge('t', 'e')],
    );
    const warnings = getPublishWarnings(g);
    expect(warnings.some((w) => w.includes('transition stages'))).toBe(true);
  });

  it('returns warning for workflows with more than 15 nodes', () => {
    const nodes: WorkflowNode[] = [
      makeNode({ id: 's', type: 'start' }),
    ];
    for (let i = 0; i < 15; i++) {
      nodes.push(makeNode({ id: `n${i}`, type: 'create_notification' }));
    }
    nodes.push(makeNode({ id: 'e', type: 'stop' }));
    // 17 nodes total, which is > 15
    const edges = nodes
      .slice(1)
      .map((n, i) => makeEdge(nodes[i].id, n.id, { id: `e${i}` }));
    const g = graph(nodes, edges);
    const warnings = getPublishWarnings(g);
    expect(warnings.some((w) => w.includes('many nodes'))).toBe(true);
  });

  it('returns warning for no branching logic', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'n', type: 'create_notification' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [makeEdge('s', 'n'), makeEdge('n', 'e')],
    );
    const warnings = getPublishWarnings(g);
    expect(warnings.some((w) => w.includes('no branching logic'))).toBe(true);
  });

  it('returns empty warnings for simple safe workflows with branching', () => {
    const g = graph(
      [
        makeNode({ id: 's', type: 'start' }),
        makeNode({ id: 'c', type: 'condition' }),
        makeNode({ id: 'n1', type: 'create_notification' }),
        makeNode({ id: 'n2', type: 'create_notification' }),
        makeNode({ id: 'e', type: 'stop' }),
      ],
      [
        makeEdge('s', 'c'),
        makeEdge('c', 'n1', { id: 'c->n1', condition: 'true' }),
        makeEdge('c', 'n2', { id: 'c->n2', condition: 'false' }),
        makeEdge('n1', 'e', { id: 'n1->e' }),
        makeEdge('n2', 'e', { id: 'n2->e' }),
      ],
    );
    const warnings = getPublishWarnings(g);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Group 3: Version Diff
// ---------------------------------------------------------------------------

describe('Version Diff', () => {
  const baseNodes = [
    makeNode({ id: 's', type: 'start', label: 'Start' }),
    makeNode({ id: 'n1', type: 'create_notification', label: 'Notify' }),
    makeNode({ id: 'e', type: 'stop', label: 'Stop' }),
  ];
  const baseEdges = [makeEdge('s', 'n1'), makeEdge('n1', 'e')];

  it('comparing identical graphs returns no changes', () => {
    const g = graph(baseNodes, baseEdges);
    const diff = compareWorkflowVersions(g, g);
    expect(diff.nodes_added).toHaveLength(0);
    expect(diff.nodes_removed).toHaveLength(0);
    expect(diff.nodes_modified).toHaveLength(0);
    expect(diff.edges_added).toHaveLength(0);
    expect(diff.edges_removed).toHaveLength(0);
    expect(diff.summary).toBe('No changes detected.');
  });

  it('adding a node shows in nodes_added', () => {
    const oldGraph = graph(baseNodes, baseEdges);
    const newNodes = [
      ...baseNodes,
      makeNode({ id: 'n2', type: 'create_approval', label: 'Approve' }),
    ];
    const newEdges = [
      ...baseEdges,
      makeEdge('n1', 'n2', { id: 'n1->n2' }),
      makeEdge('n2', 'e', { id: 'n2->e' }),
    ];
    const newGraph = graph(newNodes, newEdges);
    const diff = compareWorkflowVersions(oldGraph, newGraph);
    expect(diff.nodes_added).toHaveLength(1);
    expect(diff.nodes_added[0].id).toBe('n2');
  });

  it('removing a node shows in nodes_removed', () => {
    const oldGraph = graph(baseNodes, baseEdges);
    // Remove the middle node
    const newNodes = [baseNodes[0], baseNodes[2]];
    const newEdges = [makeEdge('s', 'e')];
    const newGraph = graph(newNodes, newEdges);
    const diff = compareWorkflowVersions(oldGraph, newGraph);
    expect(diff.nodes_removed).toHaveLength(1);
    expect(diff.nodes_removed[0].id).toBe('n1');
  });

  it('modifying a node label shows in nodes_modified', () => {
    const oldGraph = graph(baseNodes, baseEdges);
    const modifiedNodes = baseNodes.map((n) =>
      n.id === 'n1' ? { ...n, label: 'Updated Notify' } : n,
    );
    const newGraph = graph(modifiedNodes, baseEdges);
    const diff = compareWorkflowVersions(oldGraph, newGraph);
    expect(diff.nodes_modified).toHaveLength(1);
    expect(diff.nodes_modified[0].node_id).toBe('n1');
    expect(diff.nodes_modified[0].changes.some((c) => c.includes('Label changed'))).toBe(true);
  });

  it('adding an edge shows in edges_added', () => {
    const oldGraph = graph(baseNodes, baseEdges);
    const newEdges = [...baseEdges, makeEdge('s', 'e', { id: 's->e' })];
    const newGraph = graph(baseNodes, newEdges);
    const diff = compareWorkflowVersions(oldGraph, newGraph);
    expect(diff.edges_added).toHaveLength(1);
    expect(diff.edges_added[0].id).toBe('s->e');
  });

  it('comparing null old graph to new graph treats all nodes as added', () => {
    const newGraph = graph(baseNodes, baseEdges);
    const diff = compareWorkflowVersions(null, newGraph);
    expect(diff.nodes_added).toHaveLength(baseNodes.length);
    expect(diff.nodes_removed).toHaveLength(0);
    expect(diff.edges_added).toHaveLength(baseEdges.length);
  });
});
