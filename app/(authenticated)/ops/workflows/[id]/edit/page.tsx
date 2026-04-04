'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Save,
  CheckCircle2,
  Upload,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Info,
} from 'lucide-react';
import {
  getWorkflowVersionsAction,
  createDraftAction,
  validateDraftAction,
  publishVersionAction,
} from '@/app/actions/workflow-actions';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { NodePalette } from '@/components/workflow/node-palette';
import { NodeConfigPanel } from '@/components/workflow/node-config-panel';
import { EdgeEditor } from '@/components/workflow/edge-editor';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraphData,
  WorkflowVersion,
  WorkflowNodeType,
  WorkflowTriggerConfig,
} from '@/types';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_GRAPH: WorkflowGraphData = {
  nodes: [
    {
      id: 'start-node',
      type: 'start',
      label: 'Start',
      config: {},
      position: { x: 250, y: 60 },
      input_mapping: {},
      output_contract: {},
      retry_policy: null,
      timeout_ms: null,
    },
    {
      id: 'stop-node',
      type: 'stop',
      label: 'Stop',
      config: {},
      position: { x: 250, y: 340 },
      input_mapping: {},
      output_contract: {},
      retry_policy: null,
      timeout_ms: null,
    },
  ],
  edges: [
    {
      id: 'edge-start-stop',
      source_node_id: 'start-node',
      target_node_id: 'stop-node',
      condition: null,
      label: null,
      order: 0,
    },
  ],
  triggers: [],
};

function makeDefaultNode(type: WorkflowNodeType, lastPosition: { x: number; y: number }): WorkflowNode {
  return {
    id: crypto.randomUUID(),
    type,
    label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    config: {},
    position: { x: lastPosition.x + 40, y: lastPosition.y + 80 },
    input_mapping: {},
    output_contract: {},
    retry_policy: null,
    timeout_ms: null,
  };
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  validated: 'secondary',
  draft: 'outline',
  archived: 'secondary',
  validating: 'secondary',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workflowId = params.id;

  // Data loading
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<WorkflowVersion | null>(null);
  const [loading, setLoading] = useState(true);

  // Graph state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [triggers, setTriggers] = useState<WorkflowTriggerConfig[]>([]);

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Edge-creation mode: shift-click two nodes
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);

  // Validation
  const [validationErrors, setValidationErrors] = useState<unknown[]>([]);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  // Action states
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Derived
  const readOnly = activeVersion?.status === 'published';
  const isValidated = activeVersion?.status === 'validated';
  const errorNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const err of validationErrors) {
      if (typeof err === 'object' && err !== null && 'node_id' in err) {
        ids.add((err as { node_id: string }).node_id);
      }
    }
    return ids;
  }, [validationErrors]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) ?? null : null),
    [edges, selectedEdgeId],
  );

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      try {
        const data = await getWorkflowVersionsAction(workflowId);
        setVersions(data);

        // Pick latest version, prefer draft
        const draft = data.find((v) => v.status === 'draft');
        const latest = draft ?? data[0] ?? null;

        if (latest) {
          setActiveVersion(latest);
          setNodes(latest.graph_data?.nodes ?? []);
          setEdges(latest.graph_data?.edges ?? []);
          setTriggers(latest.graph_data?.triggers ?? []);
          setValidationErrors(latest.validation_errors ?? []);
        } else {
          // No versions exist yet — initialize with default graph
          setNodes(DEFAULT_GRAPH.nodes);
          setEdges(DEFAULT_GRAPH.edges);
          setTriggers(DEFAULT_GRAPH.triggers);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workflowId]);

  // ---------------------------------------------------------------------------
  // Build current graph data
  // ---------------------------------------------------------------------------

  const buildGraphData = useCallback(
    (): WorkflowGraphData => ({ nodes, edges, triggers }),
    [nodes, edges, triggers],
  );

  // ---------------------------------------------------------------------------
  // Node operations
  // ---------------------------------------------------------------------------

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      if (readOnly) return;
      const lastPos = nodes.length > 0
        ? nodes[nodes.length - 1].position
        : { x: 200, y: 100 };
      const newNode = makeDefaultNode(type, lastPos);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setSelectedEdgeId(null);
    },
    [readOnly, nodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId),
      );
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [readOnly, selectedNodeId],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (readOnly) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      );
    },
    [readOnly],
  );

  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      if (readOnly) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      );
    },
    [readOnly],
  );

  // ---------------------------------------------------------------------------
  // Node click & edge creation (shift-click)
  // ---------------------------------------------------------------------------

  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey: boolean) => {
      if (readOnly) {
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);
        return;
      }

      if (shiftKey) {
        if (!edgeSourceId) {
          setEdgeSourceId(nodeId);
        } else if (edgeSourceId !== nodeId) {
          // Create edge
          const newEdge: WorkflowEdge = {
            id: crypto.randomUUID(),
            source_node_id: edgeSourceId,
            target_node_id: nodeId,
            condition: null,
            label: null,
            order: edges.length,
          };
          setEdges((prev) => [...prev, newEdge]);
          setEdgeSourceId(null);
          setSelectedEdgeId(newEdge.id);
          setSelectedNodeId(null);
        } else {
          setEdgeSourceId(null);
        }
      } else {
        setEdgeSourceId(null);
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);
      }
    },
    [readOnly, edgeSourceId, edges.length],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
      setEdgeSourceId(null);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Edge operations
  // ---------------------------------------------------------------------------

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (readOnly) return;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [readOnly, selectedEdgeId],
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updates: Partial<WorkflowEdge>) => {
      if (readOnly) return;
      setEdges((prev) =>
        prev.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
      );
    },
    [readOnly],
  );

  // ---------------------------------------------------------------------------
  // Canvas click (deselect)
  // ---------------------------------------------------------------------------

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeSourceId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Actions: Save / Validate / Publish
  // ---------------------------------------------------------------------------

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setActionError(null);
    try {
      const result = await createDraftAction(workflowId, buildGraphData());
      if (result.error) {
        setActionError(result.error);
      } else if (result.id) {
        // Reload versions
        const data = await getWorkflowVersionsAction(workflowId);
        setVersions(data);
        const newVersion = data.find((v) => v.id === result.id) ?? data[0] ?? null;
        if (newVersion) {
          setActiveVersion(newVersion);
          setValidationErrors(newVersion.validation_errors ?? []);
        }
      }
    } catch {
      setActionError('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }, [workflowId, buildGraphData]);

  const handleValidate = useCallback(async () => {
    if (!activeVersion) {
      setActionError('Save a draft first before validating.');
      return;
    }
    setValidating(true);
    setActionError(null);
    try {
      const result = await validateDraftAction(activeVersion.id);
      if (result.error) {
        setActionError(result.error);
      } else {
        setValidationErrors(result.errors ?? []);
        if (result.valid) {
          // Reload versions to get updated status
          const data = await getWorkflowVersionsAction(workflowId);
          setVersions(data);
          const updated = data.find((v) => v.id === activeVersion.id) ?? null;
          if (updated) setActiveVersion(updated);
        }
        setErrorsExpanded(!result.valid && (result.errors?.length ?? 0) > 0);
      }
    } catch {
      setActionError('Failed to validate.');
    } finally {
      setValidating(false);
    }
  }, [activeVersion, workflowId]);

  const handlePublish = useCallback(async () => {
    if (!activeVersion) return;
    setPublishing(true);
    setActionError(null);
    try {
      const result = await publishVersionAction(activeVersion.id);
      if (result.error) {
        setActionError(result.error);
      } else {
        // Reload versions
        const data = await getWorkflowVersionsAction(workflowId);
        setVersions(data);
        const updated = data.find((v) => v.id === activeVersion.id) ?? data[0] ?? null;
        if (updated) setActiveVersion(updated);
      }
    } catch {
      setActionError('Failed to publish.');
    } finally {
      setPublishing(false);
    }
  }, [activeVersion, workflowId]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <p className="text-[13px] text-muted-foreground/60">Loading workflow editor...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ----- Top Bar ----- */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/ops/workflows/${workflowId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="h-5 w-px bg-border shrink-0" />
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] truncate">
            Workflow Editor
          </h1>
          {activeVersion && (
            <Badge
              variant={statusVariant[activeVersion.status] ?? 'outline'}
              className="text-[10px] px-1.5 py-0 shrink-0"
            >
              v{activeVersion.version_number} &middot;{' '}
              {activeVersion.status.charAt(0).toUpperCase() + activeVersion.status.slice(1)}
            </Badge>
          )}
          {validationErrors.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {readOnly && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              Read-only
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleSaveDraft}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={validating || !activeVersion}
                onClick={handleValidate}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {validating ? 'Validating...' : 'Validate'}
              </Button>
              <Button
                size="sm"
                disabled={publishing || !isValidated}
                onClick={handlePublish}
              >
                <Upload className="h-3.5 w-3.5" />
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ----- Action error ----- */}
      {actionError && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/20 shrink-0">
          <p className="text-[13px] text-destructive font-medium">{actionError}</p>
        </div>
      )}

      {/* ----- Edge creation hint ----- */}
      {edgeSourceId && (
        <div className="px-5 py-2 bg-primary/5 border-b border-primary/10 shrink-0">
          <p className="text-[12px] text-primary font-medium flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Shift-click a second node to create an edge from the selected node.
            Press Escape or click the canvas to cancel.
          </p>
        </div>
      )}

      {/* ----- 3-column layout ----- */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Node Palette */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto shrink-0">
          <NodePalette onAddNode={readOnly ? () => {} : handleAddNode} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId ?? undefined}
              readOnly={readOnly}
              onNodeSelect={(nodeId) => handleNodeClick(nodeId, false)}
              onEdgeSelect={handleEdgeClick}
              onNodeMove={handleMoveNode}
            />
          </div>

          {/* Validation errors panel */}
          {validationErrors.length > 0 && (
            <div className="border-t bg-background shrink-0">
              <button
                className="flex items-center justify-between w-full px-5 py-2 text-left hover:bg-muted/40 transition-colors"
                onClick={() => setErrorsExpanded((prev) => !prev)}
              >
                <span className="text-[12px] font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {validationErrors.length} Validation Error{validationErrors.length !== 1 ? 's' : ''}
                </span>
                {errorsExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {errorsExpanded && (
                <div className="px-5 pb-3 max-h-48 overflow-y-auto space-y-1">
                  {validationErrors.map((err, i) => {
                    const message =
                      typeof err === 'string'
                        ? err
                        : typeof err === 'object' && err !== null && 'message' in err
                          ? String((err as { message: string }).message)
                          : JSON.stringify(err);
                    const nodeId =
                      typeof err === 'object' && err !== null && 'node_id' in err
                        ? (err as { node_id: string }).node_id
                        : null;

                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-destructive/90 bg-destructive/5 rounded-lg px-3 py-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          if (nodeId) {
                            setSelectedNodeId(nodeId);
                            setSelectedEdgeId(null);
                          }
                        }}
                      >
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Config Panel / Edge Editor */}
        <div className="w-80 border-l bg-muted/30 overflow-y-auto shrink-0">
          {selectedNode ? (
            <NodeConfigPanel
              node={selectedNode}
              readOnly={readOnly}
              onUpdate={handleUpdateNodeConfig}
              onDelete={handleDeleteNode}
            />
          ) : selectedEdge ? (
            <EdgeEditor
              edge={selectedEdge}
              nodes={nodes}
              readOnly={readOnly}
              onUpdate={handleUpdateEdge}
              onDelete={handleDeleteEdge}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 mb-3">
                <Info className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground/70">No Selection</p>
              <p className="text-[12px] text-muted-foreground/50 mt-1 leading-relaxed">
                Click a node or edge to inspect and configure it.
                {!readOnly && ' Shift-click two nodes to create an edge.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
