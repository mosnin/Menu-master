'use client';

import { useCallback, useState } from 'react';
import type { WorkflowNode } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Settings2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNodeType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onDelete: (nodeId: string) => void;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NodeConfigPanel({ node, onUpdate, onDelete, readOnly = false }: NodeConfigPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateConfig = useCallback(
    (key: string, value: unknown) => {
      if (!node) return;
      onUpdate(node.id, { config: { ...node.config, [key]: value } });
    },
    [node, onUpdate],
  );

  const updateRetry = useCallback(
    (field: 'max_retries' | 'delay_ms', value: number) => {
      if (!node) return;
      const policy = node.retry_policy ?? { max_retries: 0, delay_ms: 1000 };
      onUpdate(node.id, { retry_policy: { ...policy, [field]: value } });
    },
    [node, onUpdate],
  );

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-7 text-center">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Select a node to configure</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(node.id);
    setConfirmDelete(false);
  };

  // ---- config fields by node type ----
  const configFields: React.ReactNode[] = [];

  if (node.type === 'condition') {
    configFields.push(
      <FieldGroup key="expression" label="Expression">
        <Input
          value={(node.config.expression as string) ?? ''}
          onChange={(e) => updateConfig('expression', e.target.value)}
          placeholder="e.g. health_score > 80"
          disabled={readOnly}
        />
      </FieldGroup>,
      <FieldGroup key="description" label="Description">
        <Input
          value={(node.config.description as string) ?? ''}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Describe condition..."
          disabled={readOnly}
        />
      </FieldGroup>,
    );
  }

  if (node.type === 'branch') {
    configFields.push(
      <FieldGroup key="branch_key" label="Branch Key">
        <Input
          value={(node.config.branch_key as string) ?? ''}
          onChange={(e) => updateConfig('branch_key', e.target.value)}
          placeholder="e.g. status"
          disabled={readOnly}
        />
      </FieldGroup>,
    );
  }

  if (node.type === 'wait') {
    configFields.push(
      <FieldGroup key="wait_type" label="Wait Type">
        <Select
          value={(node.config.wait_type as string) ?? 'time'}
          onValueChange={(v) => updateConfig('wait_type', v)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Time</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>,
      <FieldGroup key="duration_ms" label="Duration (ms)">
        <Input
          type="number"
          value={(node.config.duration_ms as number) ?? 0}
          onChange={(e) => updateConfig('duration_ms', Number(e.target.value))}
          disabled={readOnly}
        />
      </FieldGroup>,
      <FieldGroup key="event_type" label="Event Type">
        <Input
          value={(node.config.event_type as string) ?? ''}
          onChange={(e) => updateConfig('event_type', e.target.value)}
          placeholder="e.g. document_uploaded"
          disabled={readOnly}
        />
      </FieldGroup>,
    );
  }

  if (node.type === 'loop') {
    configFields.push(
      <FieldGroup key="max_iterations" label="Max Iterations">
        <Input
          type="number"
          min={1}
          max={100}
          value={(node.config.max_iterations as number) ?? 10}
          onChange={(e) => updateConfig('max_iterations', Math.min(100, Number(e.target.value)))}
          disabled={readOnly}
        />
      </FieldGroup>,
      <FieldGroup key="exit_condition" label="Exit Condition">
        <Input
          value={(node.config.exit_condition as string) ?? ''}
          onChange={(e) => updateConfig('exit_condition', e.target.value)}
          placeholder="e.g. items.length === 0"
          disabled={readOnly}
        />
      </FieldGroup>,
    );
  }

  if (node.type === 'human_checkpoint') {
    configFields.push(
      <FieldGroup key="instructions" label="Instructions">
        <Textarea
          value={(node.config.instructions as string) ?? ''}
          onChange={(e) => updateConfig('instructions', e.target.value)}
          placeholder="Instructions for the reviewer..."
          rows={3}
          disabled={readOnly}
        />
      </FieldGroup>,
      <FieldGroup key="assignee_role" label="Assignee Role">
        <Select
          value={(node.config.assignee_role as string) ?? 'agent'}
          onValueChange={(v) => updateConfig('assignee_role', v)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="coordinator">Coordinator</SelectItem>
            <SelectItem value="broker_admin">Broker Admin</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>,
    );
  }

  // Domain nodes: show config as key-value pairs
  const isDomainNode =
    !['start', 'stop', 'condition', 'branch', 'wait', 'loop', 'join', 'human_checkpoint'].includes(node.type);

  if (isDomainNode && Object.keys(node.config).length > 0) {
    Object.entries(node.config).forEach(([key, value]) => {
      configFields.push(
        <FieldGroup key={key} label={formatNodeType(key)}>
          <Input
            value={String(value ?? '')}
            onChange={(e) => updateConfig(key, e.target.value)}
            disabled={readOnly}
          />
        </FieldGroup>,
      );
    });
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* Header */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Node Configuration
        </p>

        <FieldGroup label="Label">
          <Input
            value={node.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            disabled={readOnly}
          />
        </FieldGroup>

        <div className="mt-3">
          <Label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Type
          </Label>
          <Badge variant="secondary">{formatNodeType(node.type)}</Badge>
        </div>
      </div>

      {configFields.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Configuration
            </p>
            <div className="flex flex-col gap-4">{configFields}</div>
          </div>
        </>
      )}

      {/* Retry & Timeout */}
      <Separator />
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Retry Policy
        </p>
        <div className="flex flex-col gap-4">
          <FieldGroup label="Max Retries">
            <Input
              type="number"
              min={0}
              value={node.retry_policy?.max_retries ?? 0}
              onChange={(e) => updateRetry('max_retries', Number(e.target.value))}
              disabled={readOnly}
            />
          </FieldGroup>
          <FieldGroup label="Retry Delay (ms)">
            <Input
              type="number"
              min={0}
              value={node.retry_policy?.delay_ms ?? 1000}
              onChange={(e) => updateRetry('delay_ms', Number(e.target.value))}
              disabled={readOnly}
            />
          </FieldGroup>
        </div>
      </div>

      <Separator />
      <FieldGroup label="Timeout (ms)">
        <Input
          type="number"
          min={0}
          value={node.timeout_ms ?? ''}
          onChange={(e) =>
            onUpdate(node.id, { timeout_ms: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="No timeout"
          disabled={readOnly}
        />
      </FieldGroup>

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
            {confirmDelete ? 'Confirm Delete' : 'Delete Node'}
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
