import type { WorkflowGraphData, WorkflowNode, WorkflowEdge } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowDiff {
  nodes_added: WorkflowNode[];
  nodes_removed: WorkflowNode[];
  nodes_modified: Array<{ node_id: string; label: string; changes: string[] }>;
  edges_added: WorkflowEdge[];
  edges_removed: WorkflowEdge[];
  trigger_changes: string[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function describeNodeChanges(
  oldNode: WorkflowNode,
  newNode: WorkflowNode,
): string[] {
  const changes: string[] = [];

  if (oldNode.type !== newNode.type) {
    changes.push(`Type changed from "${oldNode.type}" to "${newNode.type}"`);
  }

  if (oldNode.label !== newNode.label) {
    changes.push(`Label changed from "${oldNode.label}" to "${newNode.label}"`);
  }

  if (JSON.stringify(oldNode.config) !== JSON.stringify(newNode.config)) {
    changes.push('Configuration updated');
  }

  if (
    oldNode.position.x !== newNode.position.x ||
    oldNode.position.y !== newNode.position.y
  ) {
    changes.push('Position moved');
  }

  if (
    JSON.stringify(oldNode.input_mapping) !==
    JSON.stringify(newNode.input_mapping)
  ) {
    changes.push('Input mapping changed');
  }

  if (
    JSON.stringify(oldNode.output_contract) !==
    JSON.stringify(newNode.output_contract)
  ) {
    changes.push('Output contract changed');
  }

  if (
    JSON.stringify(oldNode.retry_policy) !==
    JSON.stringify(newNode.retry_policy)
  ) {
    changes.push('Retry policy changed');
  }

  if (oldNode.timeout_ms !== newNode.timeout_ms) {
    changes.push('Timeout changed');
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Main comparison function
// ---------------------------------------------------------------------------

export function compareWorkflowVersions(
  oldGraph: WorkflowGraphData | null,
  newGraph: WorkflowGraphData,
): WorkflowDiff {
  const oldNodes = oldGraph?.nodes ?? [];
  const newNodes = newGraph.nodes ?? [];
  const oldEdges = oldGraph?.edges ?? [];
  const newEdges = newGraph.edges ?? [];
  const oldTriggers = oldGraph?.triggers ?? [];
  const newTriggers = newGraph.triggers ?? [];

  const oldNodeMap = indexById(oldNodes);
  const newNodeMap = indexById(newNodes);
  const oldEdgeMap = indexById(oldEdges);
  const newEdgeMap = indexById(newEdges);

  // --- Nodes ---
  const nodes_added: WorkflowNode[] = [];
  const nodes_removed: WorkflowNode[] = [];
  const nodes_modified: Array<{ node_id: string; label: string; changes: string[] }> = [];

  for (const node of newNodes) {
    const old = oldNodeMap.get(node.id);
    if (!old) {
      nodes_added.push(node);
    } else {
      const changes = describeNodeChanges(old, node);
      if (changes.length > 0) {
        nodes_modified.push({
          node_id: node.id,
          label: node.label,
          changes,
        });
      }
    }
  }

  for (const node of oldNodes) {
    if (!newNodeMap.has(node.id)) {
      nodes_removed.push(node);
    }
  }

  // --- Edges ---
  const edges_added: WorkflowEdge[] = [];
  const edges_removed: WorkflowEdge[] = [];

  for (const edge of newEdges) {
    if (!oldEdgeMap.has(edge.id)) {
      edges_added.push(edge);
    }
  }

  for (const edge of oldEdges) {
    if (!newEdgeMap.has(edge.id)) {
      edges_removed.push(edge);
    }
  }

  // --- Triggers ---
  const trigger_changes: string[] = [];

  const oldTriggerSet = new Set(
    oldTriggers.map((t) => JSON.stringify(t)),
  );
  const newTriggerSet = new Set(
    newTriggers.map((t) => JSON.stringify(t)),
  );

  for (const t of newTriggers) {
    if (!oldTriggerSet.has(JSON.stringify(t))) {
      trigger_changes.push(`Added trigger: ${t.event_type}`);
    }
  }

  for (const t of oldTriggers) {
    if (!newTriggerSet.has(JSON.stringify(t))) {
      trigger_changes.push(`Removed trigger: ${t.event_type}`);
    }
  }

  // --- Summary ---
  const parts: string[] = [];

  if (nodes_added.length > 0) {
    parts.push(`${nodes_added.length} node(s) added`);
  }
  if (nodes_removed.length > 0) {
    parts.push(`${nodes_removed.length} node(s) removed`);
  }
  if (nodes_modified.length > 0) {
    parts.push(`${nodes_modified.length} node(s) modified`);
  }
  if (edges_added.length > 0) {
    parts.push(`${edges_added.length} edge(s) added`);
  }
  if (edges_removed.length > 0) {
    parts.push(`${edges_removed.length} edge(s) removed`);
  }
  if (trigger_changes.length > 0) {
    parts.push(`${trigger_changes.length} trigger change(s)`);
  }

  const summary =
    parts.length > 0 ? parts.join(', ') + '.' : 'No changes detected.';

  return {
    nodes_added,
    nodes_removed,
    nodes_modified,
    edges_added,
    edges_removed,
    trigger_changes,
    summary,
  };
}
