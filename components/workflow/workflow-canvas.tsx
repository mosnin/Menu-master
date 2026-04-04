'use client';

import { useCallback, useRef, useState } from 'react';
import type { WorkflowNode, WorkflowEdge } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Square,
  GitBranch,
  Clock,
  RefreshCw,
  UserCheck,
  Merge,
  AlertCircle,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Node type styling
// ---------------------------------------------------------------------------

const NODE_TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  start: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: <Play className="h-3.5 w-3.5" /> },
  stop: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <Square className="h-3.5 w-3.5" /> },
  condition: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: <GitBranch className="h-3.5 w-3.5" /> },
  branch: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: <GitBranch className="h-3.5 w-3.5" /> },
  wait: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <Clock className="h-3.5 w-3.5" /> },
  loop: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: <RefreshCw className="h-3.5 w-3.5" /> },
  join: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Merge className="h-3.5 w-3.5" /> },
  human_checkpoint: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <UserCheck className="h-3.5 w-3.5" /> },
};

const DOMAIN_STYLE = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <Zap className="h-3.5 w-3.5" /> };

function getNodeStyle(type: string) {
  return NODE_TYPE_STYLES[type] ?? DOMAIN_STYLE;
}

function formatNodeType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onEdgeSelect: (edgeId: string) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onEdgeSelect,
  readOnly = false,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ---- drag handlers ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, node: WorkflowNode) => {
      if (readOnly) return;
      e.stopPropagation();
      onNodeSelect(node.id);
      setDragging({ nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.position.x, origY: node.position.y });
    },
    [readOnly, onNodeSelect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      onNodeMove(dragging.nodeId, { x: dragging.origX + dx, y: dragging.origY + dy });
    },
    [dragging, onNodeMove],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ---- helpers to find node position ----
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="relative min-h-[600px] w-full overflow-auto rounded-2xl border bg-muted/10"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage:
          'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* SVG edges layer */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ minHeight: 600 }}>
        {edges.map((edge) => {
          const source = nodeMap.get(edge.source_node_id);
          const target = nodeMap.get(edge.target_node_id);
          if (!source || !target) return null;

          const x1 = source.position.x + NODE_WIDTH / 2;
          const y1 = source.position.y + NODE_HEIGHT;
          const x2 = target.position.x + NODE_WIDTH / 2;
          const y2 = target.position.y;
          const midY = (y1 + y2) / 2;

          return (
            <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => onEdgeSelect(edge.id)}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--border))" />
          </marker>
        </defs>
      </svg>

      {/* Nodes layer */}
      {nodes.map((node) => {
        const style = getNodeStyle(node.type);
        const isSelected = selectedNodeId === node.id;

        return (
          <div
            key={node.id}
            className={cn(
              'absolute rounded-xl border shadow-sm p-3 select-none transition-shadow',
              style.bg,
              style.border,
              isSelected && 'ring-2 ring-primary',
              !readOnly && 'cursor-grab active:cursor-grabbing',
            )}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: NODE_WIDTH,
              minHeight: NODE_HEIGHT,
            }}
            onMouseDown={(e) => handleMouseDown(e, node)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeSelect(node.id);
            }}
          >
            <div className="flex items-center gap-2">
              <span className={cn(style.text)}>{style.icon}</span>
              <span className="truncate text-sm font-medium">{node.label}</span>
            </div>
            <Badge variant="secondary" className={cn('mt-1.5 text-[10px]', style.text)}>
              {formatNodeType(node.type)}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
