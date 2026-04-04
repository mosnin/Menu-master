'use client';

import { useState, useCallback } from 'react';
import { Play, GitBranch, Clock, Repeat, UserCheck, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowGraphData, WorkflowNode, WorkflowEdge } from '@/types';

interface SimulationStep {
  index: number;
  nodeId: string;
  label: string;
  type: string;
  detail?: string;
  branches?: Array<{ label: string; targetNodeId: string }>;
}

interface SimulationPanelProps {
  graphData: WorkflowGraphData;
}

function buildTraversal(graphData: WorkflowGraphData): SimulationStep[] {
  const { nodes, edges } = graphData;
  const nodeMap = new Map<string, WorkflowNode>(nodes.map((n) => [n.id, n]));

  // Find start node
  const startNode = nodes.find((n) => n.type === 'start');
  if (!startNode) return [];

  // BFS traversal
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];
  visited.add(startNode.id);
  const steps: SimulationStep[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodeMap.get(currentId);
    if (!node) continue;

    const step: SimulationStep = {
      index: steps.length + 1,
      nodeId: node.id,
      label: node.label,
      type: node.type,
    };

    // Enrich step detail based on node type
    switch (node.type) {
      case 'condition':
      case 'branch': {
        const outgoing = edges.filter((e) => e.source_node_id === node.id);
        step.branches = outgoing.map((e) => ({
          label: e.label || e.condition || 'Default',
          targetNodeId: e.target_node_id,
        }));
        step.detail = `Branch: ${outgoing.length} path${outgoing.length !== 1 ? 's' : ''}`;
        break;
      }
      case 'wait': {
        const waitType = node.config.wait_type as string | undefined;
        if (waitType === 'time') {
          const ms = node.config.duration_ms as number | undefined;
          step.detail = ms
            ? `Wait: ${ms >= 3600000 ? `${Math.round(ms / 3600000)}h` : ms >= 60000 ? `${Math.round(ms / 60000)}m` : `${ms}ms`}`
            : 'Wait: time-based';
        } else if (waitType === 'event') {
          step.detail = `Wait: event "${node.config.event_type ?? 'unknown'}"`;
        } else {
          step.detail = `Wait: ${waitType ?? 'unknown'}`;
        }
        break;
      }
      case 'loop': {
        const maxIter = node.config.max_iterations as number | undefined;
        step.detail = `Loop: max ${maxIter ?? '?'} iterations`;
        break;
      }
      case 'human_checkpoint':
        step.detail = 'Human Checkpoint: requires approval';
        break;
    }

    steps.push(step);

    // Enqueue unvisited neighbors
    const outEdges = edges
      .filter((e) => e.source_node_id === currentId)
      .sort((a, b) => a.order - b.order);
    for (const edge of outEdges) {
      if (!visited.has(edge.target_node_id)) {
        visited.add(edge.target_node_id);
        queue.push(edge.target_node_id);
      }
    }
  }

  return steps;
}

function nodeTypeIcon(type: string) {
  switch (type) {
    case 'condition':
    case 'branch':
      return <GitBranch className="h-3.5 w-3.5" />;
    case 'wait':
      return <Clock className="h-3.5 w-3.5" />;
    case 'loop':
      return <Repeat className="h-3.5 w-3.5" />;
    case 'human_checkpoint':
      return <UserCheck className="h-3.5 w-3.5" />;
    default:
      return <Hash className="h-3.5 w-3.5" />;
  }
}

export function SimulationPanel({ graphData }: SimulationPanelProps) {
  const [steps, setSteps] = useState<SimulationStep[] | null>(null);

  const handleSimulate = useCallback(() => {
    const result = buildTraversal(graphData);
    setSteps(result);
  }, [graphData]);

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Simulation
            </p>
            <p className="text-sm font-semibold mt-0.5">
              Dry-Run Preview
            </p>
          </div>
          <Button size="sm" onClick={handleSimulate}>
            <Play className="h-4 w-4" />
            Simulate
          </Button>
        </div>

        {/* Results */}
        {steps === null ? (
          <div className="rounded-xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Click Simulate to preview the graph traversal path.
            </p>
          </div>
        ) : steps.length === 0 ? (
          <div className="rounded-xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No start node found. Cannot simulate traversal.
            </p>
          </div>
        ) : (
          <>
            {/* Total steps */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-[10px]">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
              </Badge>
              <span className="text-xs text-muted-foreground">
                estimated traversal
              </span>
            </div>

            {/* Step list */}
            <ol className="space-y-2">
              {steps.map((step) => (
                <li
                  key={step.nodeId}
                  className="flex items-start gap-3 rounded-xl bg-muted/30 p-3"
                >
                  {/* Step number */}
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 mt-0.5">
                    {step.index}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {nodeTypeIcon(step.type)}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {step.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {step.type}
                      </Badge>
                    </div>

                    {step.detail && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.detail}
                      </p>
                    )}

                    {step.branches && step.branches.length > 0 && (
                      <div className="mt-2 space-y-1 pl-1">
                        {step.branches.map((branch, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <GitBranch className="h-3 w-3 shrink-0" />
                            <span>Branch: {branch.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}
