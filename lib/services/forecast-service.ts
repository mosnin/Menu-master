import { supabase } from '@/lib/db/client';
import * as snapshotRepo from '@/lib/repositories/close-forecast-snapshots';
import { logAction } from '@/lib/audit/logger';
import type { CloseForecastSnapshot, TransactionEconomics } from '@/types';

// -----------------------------------------------------------------------------
// Forecast Service
// Revenue forecasting, pipeline summaries, and concentration risk analysis.
// -----------------------------------------------------------------------------

function formatMonth(date: Date | string): string {
  if (typeof date === 'string') {
    // If already a YYYY-MM-01 string, return as-is; otherwise parse
    if (/^\d{4}-\d{2}-01$/.test(date)) return date;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function monthRange(date: Date | string): { start: string; end: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1).toISOString().split('T')[0];
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export async function computeForecast(
  orgId: string,
  forecastMonth: Date | string,
  userId?: string,
): Promise<CloseForecastSnapshot> {
  const { start, end } = monthRange(forecastMonth);

  // Fetch all economics for the org where expected_close_date falls in the month
  const { data: economicsRows, error: econError } = await supabase
    .from('transaction_economics')
    .select('*, transactions!inner(id, status)')
    .eq('organization_id', orgId)
    .gte('expected_close_date', start)
    .lte('expected_close_date', end);

  if (econError) throw econError;

  const rows = (economicsRows ?? []) as (TransactionEconomics & {
    transactions: { id: string; status: string };
  })[];

  // Fetch health scores for at-risk counting
  const transactionIds = rows.map((r) => r.transaction_id);
  let atRiskCount = 0;

  if (transactionIds.length > 0) {
    const { data: healthRows, error: healthError } = await supabase
      .from('deal_health_scores')
      .select('transaction_id, rating')
      .in('transaction_id', transactionIds);

    if (healthError) throw healthError;

    const ratingMap = new Map<string, string>();
    for (const h of healthRows ?? []) {
      ratingMap.set(
        (h as { transaction_id: string; rating: string }).transaction_id,
        (h as { transaction_id: string; rating: string }).rating,
      );
    }

    atRiskCount = transactionIds.filter((id) => {
      const rating = ratingMap.get(id);
      return rating === 'at_risk' || rating === 'critical';
    }).length;
  }

  // Compute aggregates
  let totalProjected = 0;
  let totalWeighted = 0;
  let totalClosed = 0;
  const details: Record<string, unknown>[] = [];

  for (const row of rows) {
    const gross = row.gross_commission ?? 0;
    const prob = row.close_probability ?? 0;
    const status = row.transactions?.status ?? '';

    totalProjected += gross;
    totalWeighted += gross * prob / 100;

    if (status === 'closed') {
      totalClosed += gross;
    }

    details.push({
      transaction_id: row.transaction_id,
      gross_commission: gross,
      close_probability: prob,
      weighted_amount: gross * prob / 100,
      status,
      expected_close_date: row.expected_close_date,
    });
  }

  const now = new Date().toISOString();
  const forecastMonthStr = formatMonth(forecastMonth);
  const snapshotDate = now.split('T')[0];

  const snapshot = await snapshotRepo.upsert({
    organization_id: orgId,
    snapshot_date: snapshotDate,
    forecast_month: forecastMonthStr,
    total_projected: totalProjected,
    total_weighted: totalWeighted,
    total_closed: totalClosed,
    transaction_count: rows.length,
    at_risk_count: atRiskCount,
    details,
    computed_at: now,
  });

  await logAction({
    organizationId: orgId,
    actorType: userId ? 'user' : 'system',
    actorUserId: userId,
    action: 'forecast.computed',
    targetType: 'close_forecast_snapshot',
    targetId: snapshot.id,
    metadata: {
      forecast_month: forecastMonthStr,
      total_projected: totalProjected,
      total_weighted: totalWeighted,
      total_closed: totalClosed,
      transaction_count: rows.length,
    },
  });

  return snapshot;
}

export async function getForecast(
  orgId: string,
  month: Date | string,
): Promise<CloseForecastSnapshot | null> {
  return snapshotRepo.findByOrgAndMonth(orgId, formatMonth(month));
}

export async function getForecastRange(
  orgId: string,
  startMonth: Date | string,
  endMonth: Date | string,
): Promise<CloseForecastSnapshot[]> {
  const startStr = formatMonth(startMonth);
  const endStr = formatMonth(endMonth);

  const { data, error } = await supabase
    .from('close_forecast_snapshots')
    .select('*')
    .eq('organization_id', orgId)
    .gte('forecast_month', startStr)
    .lte('forecast_month', endStr)
    .order('forecast_month', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CloseForecastSnapshot[];
}

interface PipelineSummary {
  totalProjected: number;
  totalWeighted: number;
  byStatus: Record<string, { count: number; total: number }>;
  byOffice: Record<string, { count: number; total: number }>;
  byAgent: Record<string, { count: number; total: number }>;
}

export async function getPipelineSummary(orgId: string): Promise<PipelineSummary> {
  // Fetch active economics with transaction details
  const { data: rows, error } = await supabase
    .from('transaction_economics')
    .select('*, transactions!inner(id, status, office_id, created_by_user_id)')
    .eq('organization_id', orgId)
    .eq('is_finalized', false);

  if (error) throw error;

  const economics = (rows ?? []) as (TransactionEconomics & {
    transactions: { id: string; status: string; office_id: string | null; created_by_user_id: string };
  })[];

  let totalProjected = 0;
  let totalWeighted = 0;
  const byStatus: Record<string, { count: number; total: number }> = {};
  const byOffice: Record<string, { count: number; total: number }> = {};
  const byAgent: Record<string, { count: number; total: number }> = {};

  for (const row of economics) {
    const gross = row.gross_commission ?? 0;
    const prob = row.close_probability ?? 0;
    const status = row.transactions?.status ?? 'unknown';
    const officeId = row.transactions?.office_id ?? 'unassigned';
    const agentId = row.transactions?.created_by_user_id ?? 'unknown';

    totalProjected += gross;
    totalWeighted += gross * prob / 100;

    if (!byStatus[status]) byStatus[status] = { count: 0, total: 0 };
    byStatus[status].count += 1;
    byStatus[status].total += gross;

    if (!byOffice[officeId]) byOffice[officeId] = { count: 0, total: 0 };
    byOffice[officeId].count += 1;
    byOffice[officeId].total += gross;

    if (!byAgent[agentId]) byAgent[agentId] = { count: 0, total: 0 };
    byAgent[agentId].count += 1;
    byAgent[agentId].total += gross;
  }

  return { totalProjected, totalWeighted, byStatus, byOffice, byAgent };
}

interface ConcentrationRisk {
  topDeals: {
    transactionId: string;
    grossCommission: number;
    percentOfTotal: number;
  }[];
  hasHighConcentration: boolean;
  highConcentrationDeals: string[];
}

export async function getConcentrationRisk(orgId: string): Promise<ConcentrationRisk> {
  const { data: rows, error } = await supabase
    .from('transaction_economics')
    .select('transaction_id, gross_commission')
    .eq('organization_id', orgId)
    .eq('is_finalized', false)
    .not('gross_commission', 'is', null)
    .order('gross_commission', { ascending: false });

  if (error) throw error;

  const economics = (rows ?? []) as Pick<TransactionEconomics, 'transaction_id' | 'gross_commission'>[];

  const totalForecast = economics.reduce((sum, r) => sum + (r.gross_commission ?? 0), 0);

  const topDeals = economics.slice(0, 10).map((r) => ({
    transactionId: r.transaction_id,
    grossCommission: r.gross_commission ?? 0,
    percentOfTotal: totalForecast > 0
      ? ((r.gross_commission ?? 0) / totalForecast) * 100
      : 0,
  }));

  const highConcentrationDeals = topDeals
    .filter((d) => d.percentOfTotal > 30)
    .map((d) => d.transactionId);

  return {
    topDeals,
    hasHighConcentration: highConcentrationDeals.length > 0,
    highConcentrationDeals,
  };
}
