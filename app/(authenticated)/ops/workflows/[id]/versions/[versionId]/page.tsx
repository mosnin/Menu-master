'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitBranch,
  AlertTriangle,
  Boxes,
  ArrowRightLeft,
  Zap,
  User,
  Calendar,
  Pencil,
} from 'lucide-react';
import { getWorkflowVersionsAction } from '@/app/actions/workflow-actions';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { formatDate } from '@/lib/format';
import type { WorkflowVersion } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  validated: 'secondary',
  draft: 'outline',
  archived: 'secondary',
  validating: 'secondary',
};

export default function WorkflowVersionPage() {
  const params = useParams<{ id: string; versionId: string }>();
  const router = useRouter();
  const workflowId = params.id;
  const versionId = params.versionId;

  const [version, setVersion] = useState<WorkflowVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const versions = await getWorkflowVersionsAction(workflowId);
        const found = versions.find((v) => v.id === versionId) ?? null;
        setVersion(found);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workflowId, versionId]);

  const nodeCount = version?.graph_data?.nodes?.length ?? 0;
  const edgeCount = version?.graph_data?.edges?.length ?? 0;
  const triggerCount = version?.graph_data?.triggers?.length ?? 0;
  const errorCount = version?.validation_errors?.length ?? 0;

  const errorNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!version?.validation_errors) return ids;
    for (const err of version.validation_errors) {
      if (typeof err === 'object' && err !== null && 'node_id' in err) {
        ids.add((err as { node_id: string }).node_id);
      }
    }
    return ids;
  }, [version]);

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="Version Detail"
          backHref={`/ops/workflows/${workflowId}`}
          backLabel="Workflow"
        />
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-[13px] text-muted-foreground/60">Loading version...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="Version Not Found"
          backHref={`/ops/workflows/${workflowId}`}
          backLabel="Workflow"
        />
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-[13px] font-medium">This version could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Version ${version.version_number}`}
        description={`Viewing version ${version.version_number} of this workflow.`}
        backHref={`/ops/workflows/${workflowId}`}
        backLabel="Workflow"
        actions={
          <Link href={`/ops/workflows/${workflowId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5" />
              Edit Workflow
            </Button>
          </Link>
        }
      />

      {/* ----- Metadata ----- */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Version Metadata
        </h3>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-7">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Version
                </p>
                <p className="text-[15px] font-semibold">v{version.version_number}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Status
                </p>
                <Badge
                  variant={statusVariant[version.status] ?? 'outline'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {version.status.charAt(0).toUpperCase() + version.status.slice(1)}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                  <User className="h-3 w-3" /> Published By
                </p>
                <p className="text-[13px] text-foreground/80">
                  {version.published_by_user_id
                    ? version.published_by_user_id.slice(0, 8) + '...'
                    : '--'}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Published At
                </p>
                <p className="text-[13px] text-foreground/80">
                  {version.published_at ? formatDate(version.published_at, 'long') : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----- Graph Stats ----- */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Graph Statistics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                <Boxes className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[20px] font-bold tracking-tight">{nodeCount}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  Node{nodeCount !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[20px] font-bold tracking-tight">{edgeCount}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  Edge{edgeCount !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[20px] font-bold tracking-tight">{triggerCount}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  Trigger{triggerCount !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${errorCount > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                {errorCount > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <GitBranch className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-[20px] font-bold tracking-tight">{errorCount}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  Error{errorCount !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ----- Validation Errors ----- */}
      {errorCount > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
            Validation Errors
          </h3>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-7 space-y-2">
              {version.validation_errors.map((err, i) => {
                const message =
                  typeof err === 'string'
                    ? err
                    : typeof err === 'object' && err !== null && 'message' in err
                      ? String((err as { message: string }).message)
                      : JSON.stringify(err);

                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[12px] text-destructive/90 bg-destructive/5 rounded-xl px-4 py-3"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{message}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ----- Canvas (read-only) ----- */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Workflow Graph
        </h3>

        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[500px]">
              <WorkflowCanvas
                nodes={version.graph_data?.nodes ?? []}
                edges={version.graph_data?.edges ?? []}
                selectedNodeId={undefined}
                readOnly
                onNodeSelect={() => {}}
                onEdgeSelect={() => {}}
                onNodeMove={() => {}}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
