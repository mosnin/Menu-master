'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutomationNav } from '@/components/ops/automation-nav';
import { AutomationPageState } from '@/components/ops/automation-page-state';
import { AutomationStatusChip } from '@/components/ops/automation-status-chip';
import { useActiveOrg } from '@/lib/hooks/use-active-org';
import {
  assignDelegatedOwnershipAction,
  bootstrapGovernanceScopesAction,
  createApprovalChainAction,
  createReviewerRouteAction,
  getGovernanceOverviewAction,
  runGovernanceGapScanAction,
} from '@/app/actions/workflow-governance-actions';

export default function AutomationGovernancePage() {
  const { orgId, error: orgError, loading: orgLoading } = useActiveOrg();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assetRef, setAssetRef] = useState('');
  const [assignee, setAssignee] = useState('');
  const [scopeId, setScopeId] = useState('');

  async function load(nextOrgId: string) {
    const result = await getGovernanceOverviewAction(nextOrgId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOverview(result.overview);
  }

  useEffect(() => {
    async function init() {
      if (!orgId) return;
      setLoading(true);
      try {
        await load(orgId);
      } catch {
        setError('Failed to load governance view.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgId]);

  async function run(fn: () => Promise<Record<string, unknown>>) {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (typeof result.error === 'string') {
        setError(result.error);
        return;
      }
      await load(orgId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation Governance"
        description="Delegated ownership, multi-role approvals, and scoped enterprise governance queues."
        backHref="/ops"
        backLabel="Operations"
        actions={(
          <Link href="/ops/workflows">
            <Button variant="outline" size="sm">Workflows</Button>
          </Link>
        )}
      />
      <AutomationNav />
      <AutomationPageState
        loading={loading || orgLoading}
        loadingMessage="Loading governance..."
        orgError={orgError}
        error={error}
        onRetry={() => orgId && load(orgId)}
      >
          {overview?.summary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric title="Scopes" value={overview.summary.totalScopes} />
              <Metric title="Assignments" value={overview.summary.totalAssignments} />
              <Metric title="Open Conflicts" value={overview.summary.openConflicts} />
              <Metric title="Missing Owners" value={overview.summary.missingOwnerConflicts} />
            </div>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Enterprise Admin Controls</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => bootstrapGovernanceScopesAction(orgId!))}>Bootstrap Scopes</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => runGovernanceGapScanAction(orgId!))}>Run Gap Scan</Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delegated Ownership</p>
                  <Input placeholder="Workflow ID" value={assetRef} onChange={(event) => setAssetRef(event.target.value)} />
                  <Input placeholder="Assignee user_profile_id" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
                  <Button size="sm" disabled={busy || !assetRef || !assignee} onClick={() => run(() => assignDelegatedOwnershipAction({
                    orgId: orgId!,
                    scopeType: 'organization',
                    scopeRef: orgId!,
                    assignmentType: 'automation_owner',
                    assetType: 'workflow',
                    assetRef,
                    assignedUserId: assignee,
                    assignedRole: 'coordinator',
                    note: 'Assigned from enterprise governance panel',
                  }))}>Assign Owner</Button>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Approval Chains</p>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => createApprovalChainAction({
                    orgId: orgId!,
                    scopeType: 'organization',
                    scopeRef: orgId!,
                    assetType: 'workflow',
                    riskLevel: 'high_risk',
                    chainName: 'workflow-high-risk-default',
                  }))}>Create High-Risk Chain</Button>
                  <Input placeholder="Scope ID for route" value={scopeId} onChange={(event) => setScopeId(event.target.value)} />
                  <Button size="sm" disabled={busy || !scopeId} onClick={() => run(() => createReviewerRouteAction({
                    orgId: orgId!,
                    scopeId,
                    routeType: 'approval',
                    riskLevel: 'high_risk',
                    targetAssignmentType: 'release_reviewer',
                    fallbackRole: 'broker_admin',
                  }))}>Create Reviewer Route</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Conflict Queue</p>
                {(overview?.conflicts ?? []).slice(0, 8).map((conflict: any) => (
                  <div key={conflict.id} className="rounded-lg border p-2 bg-muted/20">
                    <p className="text-xs font-semibold flex items-center gap-2">{conflict.conflict_type} <AutomationStatusChip status={conflict.severity === 'critical' ? 'blocked' : 'ready_for_review'} /></p>
                    <p className="text-xs text-muted-foreground">{conflict.asset_type} · {conflict.asset_ref} · {conflict.severity}</p>
                  </div>
                ))}
                {(overview?.conflicts ?? []).length === 0 && <p className="text-xs text-muted-foreground">No open conflicts.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">My Governance Queues</p>
                <QueueItem label="My automation approvals" count={overview?.queues?.myAutomationApprovals?.length ?? 0} />
                <QueueItem label="My office reviews" count={overview?.queues?.myOfficeAutomationReviews?.length ?? 0} />
                <QueueItem label="My team reviews" count={overview?.queues?.myTeamAutomationReviews?.length ?? 0} />
                <QueueItem label="Missing owner queue" count={overview?.queues?.missingOwnerQueue?.length ?? 0} />
                <QueueItem label="SoD conflict queue" count={overview?.queues?.sodConflictQueue?.length ?? 0} />
              </CardContent>
            </Card>
          </div>
      </AutomationPageState>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p><p className="text-2xl font-semibold">{value}</p></CardContent></Card>
  );
}

function QueueItem({ label, count }: { label: string; count: number }) {
  return <p className="text-xs text-muted-foreground">{label}: <span className="font-semibold text-foreground">{count}</span></p>;
}
