import { auth0 } from '@/lib/auth/session';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Users,
  Building2,
  FileWarning,
} from 'lucide-react';
import Link from 'next/link';
import type { TransactionEconomics, CloseForecastSnapshot } from '@/types';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

async function getForecastData(orgId: string) {
  const [forecastRes, economicsRes] = await Promise.all([
    supabase
      .from('close_forecast_snapshots')
      .select('*')
      .eq('organization_id', orgId)
      .order('forecast_month', { ascending: true }),
    supabase
      .from('transaction_economics')
      .select('*, transactions(id, title, status, office_id)')
      .eq('organization_id', orgId),
  ]);

  return {
    forecast: (forecastRes.data ?? []) as CloseForecastSnapshot[],
    economics: (economicsRes.data ?? []) as Array<TransactionEconomics & { transactions: { id: string; title: string; status: string; office_id: string | null } | null }>,
  };
}

export default async function ForecastPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/dashboard');

  const membership = (profile as any).memberships?.[0];
  if (!membership || !['coordinator', 'broker_admin'].includes(membership.role)) {
    redirect('/dashboard');
  }

  const orgId = membership.organization_id;
  const data = await getForecastData(orgId);

  // Pipeline total for concentration calc
  const pipelineTotal = data.economics
    .filter((e) => !e.is_finalized)
    .reduce((sum, e) => sum + (e.net_brokerage_revenue ?? 0), 0);

  // Top 5 deals by revenue (concentration risk)
  const topDeals = data.economics
    .filter((e) => !e.is_finalized && (e.net_brokerage_revenue ?? 0) > 0)
    .sort((a, b) => (b.net_brokerage_revenue ?? 0) - (a.net_brokerage_revenue ?? 0))
    .slice(0, 5);

  // Missing economics: transactions that have null purchase_price or commission
  const missingEconomics = data.economics.filter(
    (e) => e.purchase_price == null || e.gross_commission == null,
  );

  // Revenue by office
  const byOffice = new Map<string, number>();
  for (const e of data.economics) {
    const officeId = e.transactions?.office_id ?? 'unassigned';
    byOffice.set(officeId, (byOffice.get(officeId) ?? 0) + (e.net_brokerage_revenue ?? 0));
  }
  const officeBreakdown = Array.from(byOffice.entries())
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <PageHeader title="Revenue Forecast" description="Monthly projections and pipeline analysis." backHref="/broker" backLabel="Broker Overview" />

      {/* Monthly Forecast Table */}
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/40">
              <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <CardTitle className="text-base font-semibold tracking-tight">Monthly Forecast</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.forecast.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground py-3 pr-4">Month</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-4">Projected</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-4">Weighted</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-4">Closed</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-4">Deals</th>
                    <th className="text-right font-medium text-muted-foreground py-3 pl-4">At Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map((f) => {
                    const month = new Date(f.forecast_month + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    });
                    return (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="py-3 pr-4 font-medium">{month}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(f.total_projected)}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(f.total_weighted)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-green-600 dark:text-green-400">{formatCurrency(f.total_closed)}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{f.transaction_count}</td>
                        <td className="py-3 pl-4 text-right">
                          {f.at_risk_count > 0 ? (
                            <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
                              {f.at_risk_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No forecast data yet" description="Add transaction economics with expected close dates to generate forecasts." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Concentration Risk */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Pipeline Concentration</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Top 5 deals as % of total</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topDeals.length > 0 ? (
              <div className="space-y-3">
                {topDeals.map((deal) => {
                  const pct = pipelineTotal > 0
                    ? ((deal.net_brokerage_revenue ?? 0) / pipelineTotal) * 100
                    : 0;
                  const isConcentrated = pct > 25;
                  return (
                    <div key={deal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/transactions/${deal.transaction_id}/overview`}
                          className="text-sm font-medium truncate hover:underline transition-colors duration-150 flex-1 min-w-0 mr-3"
                        >
                          {deal.transactions?.title ?? 'Unknown'}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm tabular-nums font-medium">{formatCurrency(deal.net_brokerage_revenue)}</span>
                          {isConcentrated && (
                            <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                              {formatPct(pct)}
                            </Badge>
                          )}
                          {!isConcentrated && (
                            <span className="text-xs text-muted-foreground tabular-nums">{formatPct(pct)}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${isConcentrated ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="No pipeline data" description="Deal concentration will be calculated once economics are entered." />
            )}
          </CardContent>
        </Card>

        {/* Missing Data Warnings */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-950/40">
                <FileWarning className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Missing Data</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Transactions without economics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {missingEconomics.length > 0 ? (
              <div className="space-y-2">
                {missingEconomics.slice(0, 10).map((e) => (
                  <Link
                    key={e.id}
                    href={`/transactions/${e.transaction_id}/overview`}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.transactions?.title ?? 'Unknown Transaction'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.purchase_price == null ? 'Missing purchase price' : ''}
                        {e.purchase_price == null && e.gross_commission == null ? ' & ' : ''}
                        {e.gross_commission == null ? 'Missing commission' : ''}
                      </p>
                    </div>
                    <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 shrink-0 ml-2">
                      Incomplete
                    </Badge>
                  </Link>
                ))}
                {missingEconomics.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{missingEconomics.length - 10} more with missing data
                  </p>
                )}
              </div>
            ) : (
              <EmptyState icon={DollarSign} title="All data complete" description="All transactions have economics data entered." />
            )}
          </CardContent>
        </Card>

        {/* Revenue by Office */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">Revenue by Office</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {officeBreakdown.length > 0 ? (
              <div className="space-y-3">
                {officeBreakdown.map((office) => {
                  const pct = pipelineTotal > 0 ? (office.amount / pipelineTotal) * 100 : 0;
                  return (
                    <div key={office.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {office.id === 'unassigned' ? 'Unassigned' : office.id.slice(0, 8)}
                        </span>
                        <span className="text-sm tabular-nums font-medium">{formatCurrency(office.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Building2} title="No office data" description="Revenue will be grouped by office once transactions are assigned." />
            )}
          </CardContent>
        </Card>

        {/* Revenue by Agent */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/40">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">Revenue by Agent</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.economics.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const byAgent = new Map<string, number>();
                  for (const e of data.economics) {
                    const agentId = e.transactions?.id ?? 'unknown';
                    const agentName = e.transactions?.title ?? 'Unknown';
                    byAgent.set(agentName, (byAgent.get(agentName) ?? 0) + (e.agent_share ?? 0));
                  }
                  const agentBreakdown = Array.from(byAgent.entries())
                    .map(([name, amount]) => ({ name, amount }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                  const maxAgent = agentBreakdown[0]?.amount ?? 1;

                  return agentBreakdown.map((agent) => (
                    <div key={agent.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1 min-w-0 mr-3">{agent.name}</span>
                        <span className="text-sm tabular-nums font-medium shrink-0">{formatCurrency(agent.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-violet-500 transition-all duration-300"
                          style={{ width: `${(agent.amount / maxAgent) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <EmptyState icon={Users} title="No agent data" description="Agent revenue splits will appear once commission data is entered." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
