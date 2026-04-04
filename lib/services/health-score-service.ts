import { supabase } from '@/lib/db/client';
import * as lenderRepo from '@/lib/repositories/lender-status-updates';
import { logAction } from '@/lib/audit/logger';
import type { DealHealthScore, HealthRating, ScoreTrend } from '@/types';

const LENDER_MILESTONE_COUNT = 7; // total possible lender milestones

function deriveRating(score: number): HealthRating {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'watch';
  if (score >= 40) return 'at_risk';
  return 'critical';
}

function deriveTrend(current: number, previous: number | null): ScoreTrend | null {
  if (previous === null) return null;
  const delta = current - previous;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'stable';
}

export async function computeHealthScore(
  transactionId: string,
  orgId: string,
): Promise<DealHealthScore> {
  const [
    completenessFactor,
    timelinessFactor,
    responsivenessFactor,
    complianceFactor,
    financingFactor,
    previousScore,
  ] = await Promise.all([
    computeCompletenessFactor(transactionId),
    computeTimelinessFactor(transactionId),
    computeResponsivenessFactor(transactionId),
    computeComplianceFactor(transactionId),
    computeFinancingFactor(transactionId),
    getLatestHealthScore(transactionId),
  ]);

  const overallScore = Math.round(
    completenessFactor * 0.25 +
    timelinessFactor * 0.25 +
    responsivenessFactor * 0.20 +
    complianceFactor * 0.15 +
    financingFactor * 0.15,
  );

  const rating = deriveRating(overallScore);
  const prevScoreValue = previousScore?.overall_score ?? null;
  const scoreTrend = deriveTrend(overallScore, prevScoreValue);

  // Build risk factors and positive signals
  const riskFactors: Record<string, unknown>[] = [];
  const positiveSignals: Record<string, unknown>[] = [];

  const factors: { name: string; value: number; label: string }[] = [
    { name: 'completeness', value: completenessFactor, label: 'Transaction completeness' },
    { name: 'timeliness', value: timelinessFactor, label: 'Checklist timeliness' },
    { name: 'responsiveness', value: responsivenessFactor, label: 'Party responsiveness' },
    { name: 'compliance', value: complianceFactor, label: 'Compliance (exceptions)' },
    { name: 'financing', value: financingFactor, label: 'Financing progress' },
  ];

  for (const f of factors) {
    if (f.value < 50) {
      riskFactors.push({
        factor: f.name,
        description: `${f.label} is low at ${f.value}%`,
        impact: 100 - f.value,
      });
    }
    if (f.value > 80) {
      positiveSignals.push({
        factor: f.name,
        description: `${f.label} is strong at ${f.value}%`,
      });
    }
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('deal_health_scores')
    .insert({
      transaction_id: transactionId,
      organization_id: orgId,
      overall_score: overallScore,
      rating,
      completeness_factor: completenessFactor,
      timeliness_factor: timelinessFactor,
      responsiveness_factor: responsivenessFactor,
      compliance_factor: complianceFactor,
      financing_factor: financingFactor,
      risk_factors: riskFactors,
      positive_signals: positiveSignals,
      previous_score: prevScoreValue,
      score_trend: scoreTrend,
      computed_at: now,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to insert health score: ${error.message}`);

  const record = data as DealHealthScore;

  await logAction({
    organizationId: orgId,
    transactionId,
    actorType: 'system',
    action: 'deal_health.computed',
    targetType: 'deal_health_score',
    targetId: record.id,
    metadata: {
      overall_score: overallScore,
      rating,
      score_trend: scoreTrend,
    },
  });

  return record;
}

/** Alias used by action layer */
export const getHealthScore = getLatestHealthScore;

export async function getLatestHealthScore(
  transactionId: string,
): Promise<DealHealthScore | null> {
  const { data, error } = await supabase
    .from('deal_health_scores')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch health score: ${error.message}`);
  return data as DealHealthScore | null;
}

export async function getHealthScoreHistory(
  transactionId: string,
  limit = 10,
): Promise<DealHealthScore[]> {
  const { data, error } = await supabase
    .from('deal_health_scores')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('computed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch health score history: ${error.message}`);
  return (data ?? []) as DealHealthScore[];
}

// ---------------------------------------------------------------------------
// Internal factor computations
// ---------------------------------------------------------------------------

async function computeCompletenessFactor(transactionId: string): Promise<number> {
  const { data } = await supabase
    .from('transaction_completeness')
    .select('completeness_score')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  return data?.completeness_score ?? 0;
}

async function computeTimelinessFactor(transactionId: string): Promise<number> {
  const { data: overdueItems } = await supabase
    .from('checklist_items')
    .select('id')
    .eq('transaction_id', transactionId)
    .lt('due_date', new Date().toISOString())
    .not('status', 'in', '("completed","skipped")');

  const overdueCount = overdueItems?.length ?? 0;
  return Math.max(0, 100 - overdueCount * 20);
}

async function computeResponsivenessFactor(transactionId: string): Promise<number> {
  const { data: obligations } = await supabase
    .from('response_obligations')
    .select('status, expected_by')
    .eq('transaction_id', transactionId)
    .in('status', ['waiting', 'overdue']);

  const overdueObligations = (obligations ?? []).filter(
    (o: { status: string; expected_by: string | null }) =>
      o.status === 'overdue' ||
      (o.expected_by && new Date(o.expected_by) < new Date()),
  );

  return Math.max(0, 100 - overdueObligations.length * 15);
}

async function computeComplianceFactor(transactionId: string): Promise<number> {
  const { data: exceptions } = await supabase
    .from('transaction_exceptions')
    .select('severity')
    .eq('transaction_id', transactionId)
    .eq('resolution_status', 'open');

  let penalty = 0;
  for (const ex of exceptions ?? []) {
    if ((ex as { severity: string }).severity === 'critical') {
      penalty += 25;
    } else if ((ex as { severity: string }).severity === 'warning') {
      penalty += 10;
    }
  }

  return Math.max(0, 100 - penalty);
}

async function computeFinancingFactor(transactionId: string): Promise<number> {
  const updates = await lenderRepo.findByTransactionId(transactionId);
  const uniqueMilestones = new Set(updates.map((u) => u.milestone));
  return Math.round((uniqueMilestones.size / LENDER_MILESTONE_COUNT) * 100);
}
