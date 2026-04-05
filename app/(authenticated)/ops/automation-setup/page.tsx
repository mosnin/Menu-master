'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AutomationNav } from '@/components/ops/automation-nav';
import { AutomationPageState } from '@/components/ops/automation-page-state';
import { AutomationStatusChip } from '@/components/ops/automation-status-chip';
import { useActiveOrg } from '@/lib/hooks/use-active-org';
import {
  createAutomationOnboardingSessionAction,
  getAutomationOnboardingDashboardAction,
  updateAutomationReadinessAction,
} from '@/app/actions/automation-onboarding-actions';
import {
  getAutomationEnvironmentReadinessAction,
  requireAutomationEnvironmentAction,
} from '@/app/actions/automation-ops-actions';

const defaultChecklist = {
  packageInstalled: true,
  entitlementsSatisfied: false,
  configurationComplete: false,
  ownerAssigned: false,
  reviewerAssigned: false,
  simulationCompleted: false,
  validationPassed: false,
  releaseReviewComplete: false,
  rolloutScopeChosen: true,
  activationCompleted: false,
};

export default function AutomationSetupPage() {
  const { orgId, error: orgError, loading: orgLoading } = useActiveOrg();
  const [dashboard, setDashboard] = useState<any>(null);
  const [setupStateId, setSetupStateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envReadiness, setEnvReadiness] = useState<{ ready: boolean; missingRequired: string[]; warnings: string[] } | null>(null);

  async function load(nextOrgId: string) {
    const [result, envResult] = await Promise.all([
      getAutomationOnboardingDashboardAction(nextOrgId),
      getAutomationEnvironmentReadinessAction(nextOrgId),
    ]);
    if (result.error) setError(result.error);
    else setDashboard(result.dashboard);

    if ('readiness' in envResult) setEnvReadiness(envResult.readiness);
  }

  useEffect(() => {
    async function init() {
      if (!orgId) return;
      setLoading(true);
      try {
        await load(orgId);
      } catch {
        setError('Failed to load automation setup dashboard.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgId]);

  async function startSetup() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAutomationOnboardingSessionAction({
        orgId,
        sessionName: 'Customer automation starter setup',
        scopeType: 'organization',
        scopeRef: orgId,
        setupMode: 'draft_only',
        checklist: defaultChecklist,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSetupStateId(result.setupStateId ?? null);
      await load(orgId);
    } finally {
      setBusy(false);
    }
  }

  async function markReady() {
    if (!orgId || !setupStateId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await updateAutomationReadinessAction({
        orgId,
        setupStateId,
        checklist: {
          packageInstalled: true,
          entitlementsSatisfied: true,
          configurationComplete: true,
          ownerAssigned: true,
          reviewerAssigned: true,
          simulationCompleted: true,
          validationPassed: true,
          releaseReviewComplete: true,
          rolloutScopeChosen: true,
          activationCompleted: false,
        },
        signals: {
          packageInstalled: true,
          simulationCompleted: true,
          releaseCompleted: true,
          safeAutomatedRunCount: 1,
          netMinutesSaved: 30,
          officeRolloutCount: 1,
          runCount: 2,
          overrideRate: 0.1,
          rolloutStalled: false,
          lowRoi: false,
          activationCompleted: true,
        },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      await load(orgId);
    } finally {
      setBusy(false);
    }
  }

  async function runEnvCheck() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requireAutomationEnvironmentAction(orgId);
      if (result.error) setError(result.error);
      setEnvReadiness(result.readiness ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation Setup"
        description="Guided onboarding, activation readiness, and first-value tracking for customer automation adoption."
        backHref="/ops"
        backLabel="Operations"
        actions={<Link href="/ops/automation-library"><Button size="sm" variant="outline">Library</Button></Link>}
      />
      <AutomationNav />

      <AutomationPageState
        loading={loading || orgLoading}
        loadingMessage="Loading setup dashboard..."
        orgError={orgError}
        error={error}
        onRetry={() => orgId && load(orgId)}
      >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric title="Setup States" value={dashboard?.summary?.setupStates ?? 0} />
            <Metric title="Open Blockers" value={dashboard?.summary?.openBlockers ?? 0} />
            <Metric title="Ready Checklists" value={dashboard?.summary?.readyChecklists ?? 0} />
            <Metric title="Milestones" value={dashboard?.summary?.achievedMilestones ?? 0} />
            <Metric title="Underperforming" value={dashboard?.summary?.underperforming ?? 0} />
            <Metric title="ROI Tracked" value={dashboard?.summary?.roiTrackedWorkflows ?? 0} />
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Guided Setup Wizard</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={startSetup} disabled={busy}>Start onboarding session</Button>
                <Button size="sm" variant="outline" onClick={markReady} disabled={busy || !setupStateId}>Mark readiness + value milestones</Button>
                <Button size="sm" variant="outline" onClick={runEnvCheck} disabled={busy}>Validate environment</Button>
              </div>
              <p className="text-xs text-muted-foreground">No install or activation is automatic; release and governance controls remain required.</p>
              {envReadiness && (
                <div className="rounded-lg border bg-muted/20 p-2 text-xs space-y-1">
                  <p className="font-semibold">Environment: {envReadiness.ready ? 'ready' : 'blocked'}</p>
                  {envReadiness.missingRequired.length > 0 && (
                    <p className="text-destructive">Missing required: {envReadiness.missingRequired.join(', ')}</p>
                  )}
                  {envReadiness.warnings.length > 0 && (
                    <p className="text-muted-foreground">{envReadiness.warnings[0]}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Recommended Automations</p>
                {(dashboard?.recommendations ?? []).slice(0, 8).map((item: any) => (
                  <div key={item.packageId} className="rounded-lg border p-2 bg-muted/20">
                    <p className="text-xs font-semibold">{item.packageName} · score {item.score}</p>
                    <p className="text-xs text-muted-foreground">{(item.reasons ?? []).join(' ') || 'No recommendation rationale available.'}</p>
                  </div>
                ))}
                {(dashboard?.recommendations ?? []).length === 0 && <p className="text-xs text-muted-foreground">No package recommendations yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Activation Blockers</p>
                {(dashboard?.blockers ?? []).slice(0, 8).map((blocker: any) => (
                  <div key={blocker.id} className="rounded-lg border p-2 bg-muted/20">
                    <p className="text-xs font-semibold flex items-center gap-2">{blocker.blocker_type} <AutomationStatusChip status={blocker.severity === 'critical' ? 'blocked' : 'ready_for_review'} /></p>
                    <p className="text-xs text-muted-foreground">{blocker.details}</p>
                  </div>
                ))}
                {(dashboard?.blockers ?? []).length === 0 && <p className="text-xs text-muted-foreground">No open blockers.</p>}
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
