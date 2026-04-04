'use client';

import { useState } from 'react';
import type { WorkflowEdge, WorkflowNode } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Trash2, Cable } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EdgeEditorProps {
  edge: WorkflowEdge | null;
  nodes: WorkflowNode[];
  onUpdate: (edgeId: string, updates: Partial<WorkflowEdge>) => void;
  onDelete: (edgeId: string) => void;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EdgeEditor({ edge, nodes, onUpdate, onDelete, readOnly = false }: EdgeEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!edge) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-7 text-center">
        <Cable className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Select an edge to configure</p>
      </div>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const sourceNode = nodeMap.get(edge.source_node_id);
  const targetNode = nodeMap.get(edge.target_node_id);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(edge.id);
    setConfirmDelete(false);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* Header */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Edge Configuration
        </p>

        {/* Source → Target */}
        <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3 text-sm">
          <span className="truncate font-medium">{sourceNode?.label ?? edge.source_node_id}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{targetNode?.label ?? edge.target_node_id}</span>
        </div>
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="flex flex-col gap-4">
        <FieldGroup label="Label">
          <Input
            value={edge.label ?? ''}
            onChange={(e) => onUpdate(edge.id, { label: e.target.value || null })}
            placeholder="Optional label..."
            disabled={readOnly}
          />
        </FieldGroup>

        <FieldGroup label="Condition">
          <Input
            value={edge.condition ?? ''}
            onChange={(e) => onUpdate(edge.id, { condition: e.target.value || null })}
            placeholder="e.g. result === true"
            disabled={readOnly}
          />
        </FieldGroup>

        <FieldGroup label="Order">
          <Input
            type="number"
            min={0}
            value={edge.order}
            onChange={(e) => onUpdate(edge.id, { order: Number(e.target.value) })}
            disabled={readOnly}
          />
        </FieldGroup>
      </div>

      {/* Delete */}
      {!readOnly && (
        <>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {confirmDelete ? 'Confirm Delete' : 'Delete Edge'}
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
