'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AutomationNav } from '@/components/ops/automation-nav';
import { AutomationPageState } from '@/components/ops/automation-page-state';
import { AutomationStatusChip } from '@/components/ops/automation-status-chip';
import { useActiveOrg } from '@/lib/hooks/use-active-org';
import {
  exportAutomationPackageAction,
  getAutomationPackagingOverviewAction,
  importAutomationBundleAction,
} from '@/app/actions/automation-packaging-actions';

export default function AutomationLibraryPage() {
  const { orgId, error: orgError, loading: orgLoading } = useActiveOrg();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exportVersionId, setExportVersionId] = useState('');
  const [bundleText, setBundleText] = useState('');
  const [importMode, setImportMode] = useState<'draft_only' | 'template_only' | 'library_copy'>('draft_only');

  async function load(nextOrgId: string) {
    const result = await getAutomationPackagingOverviewAction(nextOrgId);
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
        setError('Failed to load automation library.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgId]);

  async function onExport() {
    if (!orgId || !exportVersionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await exportAutomationPackageAction({ orgId, packageVersionId: exportVersionId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setBundleText(JSON.stringify(result.bundle, null, 2));
      await load(orgId);
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!orgId || !bundleText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importAutomationBundleAction({
        orgId,
        installMode: importMode,
        sourceType: 'upload',
        trustState: 'untrusted',
        rawBundle: bundleText,
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation Library"
        description="Package, export, import, and distribute automation assets with entitlement and compatibility controls."
        backHref="/ops"
        backLabel="Operations"
        actions={<Link href="/ops/workflows"><Button variant="outline" size="sm">Workflows</Button></Link>}
      />
      <AutomationNav />

      <AutomationPageState
        loading={loading || orgLoading}
        loadingMessage="Loading library packaging controls..."
        orgError={orgError}
        error={error}
        onRetry={() => orgId && load(orgId)}
      >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric title="Packages" value={overview?.summary?.totalPackages ?? 0} />
            <Metric title="Published Versions" value={overview?.summary?.publishedVersions ?? 0} />
            <Metric title="Blocked Imports" value={overview?.summary?.blockedImports ?? 0} />
            <Metric title="Recent Exports" value={overview?.summary?.exportEvents ?? 0} />
            <Metric title="Installed Assets" value={overview?.summary?.activeInstallations ?? 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Export Bundle</p>
                <Input
                  placeholder="Package version ID"
                  value={exportVersionId}
                  onChange={(event) => setExportVersionId(event.target.value)}
                />
                <Button size="sm" disabled={busy || !exportVersionId} onClick={onExport}>Export Structured Bundle</Button>
                <p className="text-xs text-muted-foreground">Exports exclude secrets and restricted evidence fields.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Import Bundle</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant={importMode === 'draft_only' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('draft_only')}>Draft only</Button>
                  <Button variant={importMode === 'template_only' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('template_only')}>Template only</Button>
                  <Button variant={importMode === 'library_copy' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('library_copy')}>Library copy</Button>
                </div>
                <Textarea rows={12} value={bundleText} onChange={(event) => setBundleText(event.target.value)} placeholder="Paste automation bundle JSON" />
                <Button size="sm" disabled={busy || !bundleText.trim()} onClick={onImport}>Run Compatibility + Import</Button>
                <p className="text-xs text-muted-foreground">Imports are never auto-activated into live runtime.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Installed Packages</p>
                {(overview?.installations ?? []).slice(0, 8).map((entry: any) => (
                  <p key={entry.id} className="text-xs text-muted-foreground">{entry.installation_mode} · {entry.installed_asset_type} · {entry.status}</p>
                ))}
                {(overview?.installations ?? []).length === 0 && <p className="text-xs text-muted-foreground">No installations yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Import Review Queue</p>
                {(overview?.imports ?? []).slice(0, 8).map((entry: any) => (
                  <p key={entry.id} className="text-xs text-muted-foreground flex items-center gap-2">{entry.package_key} <AutomationStatusChip status={entry.install_state} /> <span>{entry.requested_mode}</span></p>
                ))}
                {(overview?.imports ?? []).length === 0 && <p className="text-xs text-muted-foreground">No imports yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Entitlements + Flags</p>
                {(overview?.entitlements ?? []).slice(0, 6).map((entry: any) => (
                  <p key={entry.id} className="text-xs text-muted-foreground">entitlement: {entry.feature_key} · {entry.plan_tier}</p>
                ))}
                {(overview?.flags ?? []).slice(0, 6).map((entry: any) => (
                  <p key={entry.id} className="text-xs text-muted-foreground">flag: {entry.feature_key} · {entry.flag_variant}</p>
                ))}
                {(overview?.entitlements ?? []).length === 0 && (overview?.flags ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No capability controls configured yet.</p>
                )}
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
