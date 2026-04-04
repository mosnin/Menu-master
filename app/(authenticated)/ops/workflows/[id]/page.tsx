'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Clock, Play } from 'lucide-react';
import { getWorkflowVersionsAction } from '@/app/actions/workflow-actions';
import { formatDate } from '@/lib/format';
import type { WorkflowVersion } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  validated: 'secondary',
  draft: 'outline',
  archived: 'secondary',
  validating: 'secondary',
};

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getWorkflowVersionsAction(params.id);
        setVersions(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Workflow Detail"
        description={`Versions and configuration for workflow ${params.id.slice(0, 8)}...`}
        backHref="/ops/workflows"
        backLabel="Workflows"
        actions={
          <Link
            href="/ops/workflow-runs"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
          >
            <Play className="h-3.5 w-3.5" />
            View Runs
          </Link>
        }
      />

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Versions
        </h3>

        {loading ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-[13px] text-muted-foreground/60">Loading versions...</p>
            </CardContent>
          </Card>
        ) : versions.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <GitBranch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[13px] font-medium">No versions yet</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Create a draft version to begin building this workflow.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => {
              const nodeCount = v.graph_data?.nodes?.length ?? 0;
              const edgeCount = v.graph_data?.edges?.length ?? 0;

              return (
                <Card key={v.id} className="rounded-xl shadow-sm">
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                      <span className="text-[13px] font-bold text-primary">v{v.version_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold tracking-[-0.01em]">
                          Version {v.version_number}
                        </p>
                        <Badge
                          variant={statusVariant[v.status] ?? 'outline'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
                        {v.published_at && (
                          <> · Published {formatDate(v.published_at, 'relative')}</>
                        )}
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">
                      {formatDate(v.created_at, 'relative')}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
