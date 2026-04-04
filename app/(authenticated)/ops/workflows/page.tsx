'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';
import { getWorkflowsAction } from '@/app/actions/workflow-actions';
import type { Workflow } from '@/types';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // In a real app the orgId would come from context; use a placeholder fetch pattern
        const res = await fetch('/api/me');
        if (res.ok) {
          const me = await res.json();
          const orgId = me.memberships?.[0]?.organization_id;
          if (orgId) {
            const data = await getWorkflowsAction(orgId);
            setWorkflows(data);
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
      <PageHeader
        title="Workflows"
        description="Automation workflows configured for your organization."
        backHref="/ops"
        backLabel="Operations"
      />

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          All Workflows
        </h3>

        {loading ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-[13px] text-muted-foreground/60">Loading workflows...</p>
            </CardContent>
          </Card>
        ) : workflows.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <GitBranch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[13px] font-medium">No workflows found</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Create a workflow to get started with automation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <Link key={wf.id} href={`/ops/workflows/${wf.id}`}>
                <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] shrink-0">
                      <GitBranch className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold tracking-[-0.01em] truncate">{wf.name}</p>
                      {wf.description && (
                        <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">{wf.description}</p>
                      )}
                    </div>
                    <Badge
                      variant={wf.is_active ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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
