'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeAutomationEconomicsAction, getAutomationEconomicsOverviewAction } from '@/app/actions/workflow-economics-actions';
import { AutomationNav } from '@/components/ops/automation-nav';
import { AutomationPageState } from '@/components/ops/automation-page-state';
import { AutomationStatusChip } from '@/components/ops/automation-status-chip';
import { useActiveOrg } from '@/lib/hooks/use-active-org';

export default function AutomationEconomicsPage() {
  const { orgId, error: orgError, loading: orgLoading } = useActiveOrg();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [windowDays, setWindowDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  async function load(nextOrgId: string) {
    const result = await getAutomationEconomicsOverviewAction(nextOrgId);
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
        setError('Failed to load automation economics.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgId]);

  async function recompute() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const days = Number(windowDays || 30);
      const result = await computeAutomationEconomicsAction(orgId, Number.isFinite(days) ? days : 30);
      if (result.error) {
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
        title="Automation Economics"
        description="Time saved, manual work displaced, ROI ranking, and churn-heavy automation visibility."
        backHref="/ops"
        backLabel="Operations"
        actions={(
          <Link href="/ops/automation-governance"><Button variant="outline" size="sm">Governance</Button></Link>
        )}
      />
      <AutomationNav />
      <AutomationPageState
        loading={loading || orgLoading}
        loadingMessage="Loading economics..."
        orgError={orgError}
        error={error}
        onRetry={() => orgId && load(orgId)}
      >
          {overview?.summary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Metric title="Workflows Measured" value={overview.summary.workflowCount} />
              <Metric title="Net Minutes Saved" value={Math.round(overview.summary.totalNetMinutesSaved)} />
              <Metric title="Gross Minutes Saved" value={Math.round(overview.summary.totalGrossMinutesSaved)} />
              <Metric title="Avg Override Rate" value={`${(overview.summary.averageOverrideRate * 100).toFixed(1)}%`} />
              <Metric title="Negative Signals" value={overview.summary.negativeSignalCount} />
            </div>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Economics Computation</p>
              <div className="flex items-center gap-2">
                <Input value={windowDays} onChange={(event) => setWindowDays(event.target.value)} placeholder="Window days" />
                <Button disabled={busy} onClick={recompute}>Recompute ROI</Button>
              </div>
              <p className="text-xs text-muted-foreground">Assumptions are heuristic and explainable (minutes-per-action defaults, review/correction costs, and confidence bands).</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Top Value Workflows</p>
                {(overview?.topValue ?? []).map((row: any) => (
                  <div key={row.id} className="rounded-lg border p-2 bg-muted/20">
                    <p className="text-xs font-semibold">Workflow: {row.asset_ref}</p>
                    <p className="text-xs text-muted-foreground">Net minutes: {Number(row.net_minutes_saved).toFixed(1)} · Score: {Number(row.estimated_value_score).toFixed(1)} · Confidence: {row.confidence}</p>
                  </div>
                ))}
                {(overview?.topValue ?? []).length === 0 && <p className="text-xs text-muted-foreground">No ROI summaries yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Underperforming / Churn Signals</p>
                {(overview?.negatives ?? []).slice(0, 8).map((signal: any) => (
                  <div key={signal.id} className="rounded-lg border p-2 bg-muted/20">
                    <p className="text-xs font-semibold flex items-center gap-2"><AutomationStatusChip status="low_value" /> <span>{signal.signal_type} · {signal.recommendation}</span></p>
                    <p className="text-xs text-muted-foreground">Workflow: {signal.asset_ref} · Severity: {signal.severity}</p>
                    <p className="text-xs text-muted-foreground">{signal.details}</p>
                  </div>
                ))}
                {(overview?.negatives ?? []).length === 0 && <p className="text-xs text-muted-foreground">No negative value signals detected.</p>}
              </CardContent>
            </Card>
          </div>
      </AutomationPageState>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p><p className="text-2xl font-semibold">{value}</p></CardContent></Card>;
}
