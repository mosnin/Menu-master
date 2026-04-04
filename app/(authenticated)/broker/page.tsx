import { auth0 } from '@/lib/auth/session';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  Shield,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Eye,
  CircleAlert,
  TriangleAlert,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type {
  TransactionEconomics,
  ComplianceIssue,
  PolicyOverride,
  DealHealthScore,
  CloseForecastSnapshot,
} from '@/types';

async function getBrokerData(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const [
    economicsRes,
    complianceRes,
    overridesRes,
    healthRes,
    forecastRes,
  ] = await Promise.all([
    supabase
      .from('transaction_economics')
      .select('*, transactions(id, title, status)')
      .eq('organization_id', orgId),
    supabase
      .from('compliance_issues')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['open', 'under_review', 'blocked'])
      .order('created_at', { ascending: false }),
    supabase
      .from('policy_overrides')
      .select('*, policy_rules(name), transactions(id, title)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('deal_health_scores')
      .select('*, transactions(id, title)')
      .eq('organization_id', orgId)
      .order('computed_at', { ascending: false }),
    supabase
      .from('close_forecast_snapshots')
      .select('*')
      .eq('organization_id', orgId)
      .order('forecast_month', { ascending: true })
      .limit(3),
  ]);

  return {
    economics: (economicsRes.data ?? []) as Array<TransactionEconomics & { transactions: { id: string; title: string; status: string } | null }>,
    compliance: (complianceRes.data ?? []) as ComplianceIssue[],
    overrides: (overridesRes.data ?? []) as Array<PolicyOverride & { policy_rules: { name: string } | null; transactions: { id: string; title: string } | null }>,
    health: (healthRes.data ?? []) as Array<DealHealthScore & { transactions: { id: string; title: string } | null }>,
    forecast: (forecastRes.data ?? []) as CloseForecastSnapshot[],
  };
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function BrokerOverviewPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/dashboard');

  const membership = (profile as any).memberships?.[0];
  if (!membership || membership.role !== 'broker_admin') {
    redirect('/dashboard');
  }

  const orgId = membership.organization_id;
  const data = await getBrokerData(orgId);

  // Revenue calculations
  const totalProjected = data.economics
    .filter((e) => !e.is_finalized)
    .reduce((sum, e) => sum + (e.net_brokerage_revenue ?? 0), 0);

  const totalWeighted = data.economics
    .filter((e) => !e.is_finalized)
    .reduce((sum, e) => sum + (e.net_brokerage_revenue ?? 0) * (e.close_probability ?? 0) / 100, 0);

  const totalClosed = data.economics
    .filter((e) => e.is_finalized)
    .reduce((sum, e) => sum + (e.net_brokerage_revenue ?? 0), 0);

  // Health counts
  const healthByRating = { healthy: 0, watch: 0, at_risk: 0, critical: 0 };
  const seenTx = new Set<string>();
  for (const h of data.health) {
    if (!seenTx.has(h.transaction_id)) {
      seenTx.add(h.transaction_id);
      const r = h.rating as keyof typeof healthByRating;
      if (r in healthByRating) healthByRating[r]++;
    }
  }

  // Compliance summary
  const openIssues = data.compliance.filter((i) => i.status === 'open');
  const criticalIssues = data.compliance.filter((i) => i.severity === 'critical');
  const pendingOverrides = data.overrides;

  // Top at-risk closings (5 worst health scores)
  const uniqueHealth = new Map<string, (typeof data.health)[0]>();
  for (const h of data.health) {
    if (!uniqueHealth.has(h.transaction_id) || h.overall_score < (uniqueHealth.get(h.transaction_id)!.overall_score)) {
      uniqueHealth.set(h.transaction_id, h);
    }
  }
  const atRiskClosings = Array.from(uniqueHealth.values())
    .sort((a, b) => a.overall_score - b.overall_score)
    .slice(0, 5);

  // Recent compliance issues (5 latest open)
  const recentCompliance = data.compliance
    .filter((i) => i.status === 'open')
    .slice(0, 5);

  const ratingConfig: Record<string, { label: string; className: string }> = {
    healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' },
    watch: { label: 'Watch', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
    at_risk: { label: 'At Risk', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' },
  };

  const severityConfig: Record<string, { className: string }> = {
    info: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' },
    warning: { className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
    critical: { className: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' },
  };

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="pt-2 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight">Broker Overview</h1>
        <p className="text-muted-foreground mt-2 text-base leading-relaxed">
          Revenue pipeline, compliance health, and close forecast at a glance.
        </p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Projected</p>
                <p className="text-3xl font-semibold tracking-tight mt-2">{formatCurrency(totalProjected)}</p>
                <p className="text-xs text-muted-foreground mt-1">Unfinalised pipeline</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/40">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Weighted</p>
                <p className="text-3xl font-semibold tracking-tight mt-2">{formatCurrency(totalWeighted)}</p>
                <p className="text-xs text-muted-foreground mt-1">Probability-adjusted</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-2.5 dark:bg-violet-950/40">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closed This Month</p>
                <p className="text-3xl font-semibold tracking-tight mt-2 text-green-600 dark:text-green-400">{formatCurrency(totalClosed)}</p>
                <p className="text-xs text-muted-foreground mt-1">Finalized revenue</p>
              </div>
              <div className="rounded-lg bg-green-50 p-2.5 dark:bg-green-950/40">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Health + Compliance + Close Forecast */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pipeline Health */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">Pipeline Health</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-green-50 p-2 dark:bg-green-950/40">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                  <p className="text-xl font-semibold tracking-tight text-green-600 dark:text-green-400">{healthByRating.healthy}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                  <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Watch</p>
                  <p className="text-xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">{healthByRating.watch}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-950/40">
                  <CircleAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                  <p className="text-xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">{healthByRating.at_risk}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                  <TriangleAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Critical</p>
                  <p className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400">{healthByRating.critical}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">Compliance</CardTitle>
            </div>
            <Link
              href="/broker/compliance"
              className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">Open Issues</span>
                <span className="text-lg font-semibold tracking-tight">{openIssues.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-red-200/50 bg-red-50/30 p-3 dark:border-red-900/30 dark:bg-red-950/20">
                <span className="text-sm text-muted-foreground">Critical</span>
                <span className="text-lg font-semibold tracking-tight text-red-600 dark:text-red-400">{criticalIssues.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-200/50 bg-amber-50/30 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                <span className="text-sm text-muted-foreground">Pending Overrides</span>
                <span className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400">{pendingOverrides.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Close Forecast */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/40">
                <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">Close Forecast</CardTitle>
            </div>
            <Link
              href="/broker/forecast"
              className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.forecast.length > 0 ? (
              <div className="space-y-3">
                {data.forecast.map((f) => {
                  const month = new Date(f.forecast_month + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{month}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.transaction_count} deal{f.transaction_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(f.total_projected)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          {formatCurrency(f.total_weighted)} weighted
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold tracking-tight">No forecast data</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Forecasts will appear once transaction economics are added.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections: At-Risk + Overrides + Compliance */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top At-Risk Closings */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-950/40">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Top At-Risk Closings</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">5 lowest health scores</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {atRiskClosings.length > 0 ? (
              <div className="space-y-2">
                {atRiskClosings.map((h) => {
                  const rc = ratingConfig[h.rating] ?? ratingConfig.watch;
                  return (
                    <Link
                      key={h.id}
                      href={`/transactions/${h.transaction_id}/overview`}
                      className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {h.transactions?.title ?? 'Unknown Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Score: <span className="font-medium tabular-nums">{h.overall_score}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <Badge className={`text-[10px] font-medium rounded-md px-2 py-0.5 ${rc.className}`}>
                          {rc.label}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-green-50 p-4 mb-4 dark:bg-green-950/40">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">All deals healthy</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  At-risk transactions will appear here when health scores drop.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Overrides */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Pending Overrides</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Policy overrides needing approval</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingOverrides.length > 0 ? (
              <div className="space-y-2">
                {pendingOverrides.map((o) => (
                  <Link
                    key={o.id}
                    href={`/transactions/${o.transaction_id}/overview`}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {o.transactions?.title ?? 'Unknown Transaction'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {o.policy_rules?.name ?? 'Policy Rule'} &middot; {o.override_reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                        Pending
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-green-50 p-4 mb-4 dark:bg-green-950/40">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">No pending overrides</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  Policy override requests that need broker approval will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Compliance Issues */}
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Recent Compliance Issues</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Latest 5 open issues</p>
              </div>
            </div>
            <Link
              href="/broker/compliance"
              className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentCompliance.length > 0 ? (
              <div className="space-y-2">
                {recentCompliance.map((issue) => {
                  const sev = severityConfig[issue.severity] ?? severityConfig.info;
                  return (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors duration-150 hover:bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {issue.description ?? issue.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <Badge className={`text-[10px] font-medium rounded-md px-2 py-0.5 ${sev.className}`}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] rounded-md px-2 py-0.5">
                          {issue.category.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-green-50 p-4 mb-4 dark:bg-green-950/40">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold tracking-tight">No open compliance issues</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  Compliance issues flagged by policy rules will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
