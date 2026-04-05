'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock } from 'lucide-react';
import { getWorkflowRunsAction } from '@/app/actions/workflow-actions';
import { AutomationNav } from '@/components/ops/automation-nav';
import { formatDate, humanizeStatus } from '@/lib/format';
import type { WorkflowRun } from '@/types';

const statusColor: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  waiting: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  timed_out: 'bg-orange-100 text-orange-800',
};

function durationLabel(run: WorkflowRun): string {
  if (!run.started_at) return '--';
  const start = new Date(run.started_at).getTime();
  const end = run.completed_at ? new Date(run.completed_at).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export default function WorkflowRunsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const me = await res.json();
          const orgId = me.memberships?.[0]?.organization_id;
          if (orgId) {
            const data = await getWorkflowRunsAction(orgId, { limit: 50 });
            setRuns(data);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-10">
      <AutomationNav />
      <PageHeader
        title="Workflow Runs"
        description="Monitor workflow executions across your organization."
        backHref="/ops"
        backLabel="Operations"
      />

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Recent Runs
        </h3>

        {loading ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-[13px] text-muted-foreground/60">Loading runs...</p>
            </CardContent>
          </Card>
        ) : runs.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <Play className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[13px] font-medium">No workflow runs yet</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Runs will appear here once workflows are triggered.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Link key={run.id} href={`/ops/workflow-runs/${run.id}`}>
                <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                      <Play className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold tracking-[-0.01em] truncate">
                        {run.workflow_id.slice(0, 8)}...
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {run.trigger_event_type ? humanizeStatus(run.trigger_event_type) : 'Unknown trigger'}
                        {run.entity_type && run.entity_id && (
                          <> · {humanizeStatus(run.entity_type)} {run.entity_id.slice(0, 8)}</>
                        )}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 ${statusColor[run.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {humanizeStatus(run.status)}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{durationLabel(run)}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/40 shrink-0">
                      {formatDate(run.started_at ?? run.created_at, 'relative')}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
