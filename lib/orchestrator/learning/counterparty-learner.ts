import * as SignalRepo from '@/lib/repositories/orchestrator-counterparty-signals';
import * as ProfileRepo from '@/lib/repositories/orchestrator-counterparty-profiles';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type {
  CounterpartyType,
  CounterpartySignalType,
  OrchestratorCounterpartyProfile,
} from '@/types';

/**
 * Record a counterparty behavior signal.
 */
export async function recordSignal(params: {
  organizationId: string;
  orchestratorId: string;
  counterpartyType: CounterpartyType;
  counterpartyId?: string;
  signalType: CounterpartySignalType;
  expectedHours?: number;
  actualHours?: number;
  entityType?: string;
  stage?: string;
  obligationType?: string;
}): Promise<void> {
  const deviationHours =
    params.expectedHours != null && params.actualHours != null
      ? params.actualHours - params.expectedHours
      : null;

  await SignalRepo.create({
    organization_id: params.organizationId,
    orchestrator_id: params.orchestratorId,
    counterparty_type: params.counterpartyType,
    counterparty_id: params.counterpartyId ?? null,
    signal_type: params.signalType,
    expected_hours: params.expectedHours ?? null,
    actual_hours: params.actualHours ?? null,
    deviation_hours: deviationHours,
    entity_type: params.entityType ?? null,
    stage: params.stage ?? null,
    obligation_type: params.obligationType ?? null,
  });

  await LearningEventRepo.create({
    organization_id: params.organizationId,
    orchestrator_id: params.orchestratorId,
    event_type: 'counterparty_signal',
    detail: {
      counterparty_type: params.counterpartyType,
      counterparty_id: params.counterpartyId ?? null,
      signal_type: params.signalType,
      expected_hours: params.expectedHours ?? null,
      actual_hours: params.actualHours ?? null,
      deviation_hours: deviationHours,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });
}

/**
 * Update aggregated counterparty profile from recent signals.
 * Recalculates avg, median, p90 response times, missed deadline rates.
 */
export async function updateProfile(
  organizationId: string,
  counterpartyType: CounterpartyType,
  counterpartyId?: string,
): Promise<void> {
  const signals = await SignalRepo.findByCounterpartyType(
    organizationId,
    counterpartyType,
    500,
  );

  // Filter to signals matching the specific counterparty if provided
  const relevant = counterpartyId
    ? signals.filter(s => s.counterparty_id === counterpartyId)
    : signals;

  if (relevant.length === 0) return;

  // Gather response time signals with actual_hours
  const responseTimeSignals = relevant.filter(
    s => s.signal_type === 'response_time' && s.actual_hours != null,
  );
  const actualHours = responseTimeSignals.map(s => s.actual_hours as number);

  const avgResponseHours =
    actualHours.length > 0
      ? actualHours.reduce((a, b) => a + b, 0) / actualHours.length
      : null;

  const medianResponseHours =
    actualHours.length > 0 ? computeMedian(actualHours) : null;

  const p90ResponseHours =
    actualHours.length > 0 ? computePercentile(actualHours, 90) : null;

  // Missed deadline rate
  const totalInteractions = relevant.length;
  const missedDeadlineCount = relevant.filter(
    s => s.signal_type === 'missed_deadline',
  ).length;
  const missedDeadlineRate =
    totalInteractions > 0 ? missedDeadlineCount / totalInteractions : 0;

  // Follow-up effectiveness: ratio of follow-up signals that eventually
  // had a subsequent response_time or early_response signal
  const followUpSignals = relevant.filter(
    s => s.signal_type === 'requires_follow_up',
  );
  const responseSignals = relevant.filter(
    s => s.signal_type === 'response_time' || s.signal_type === 'early_response',
  );
  const followUpEffectiveness =
    followUpSignals.length > 0
      ? Math.min(1, responseSignals.length / followUpSignals.length)
      : 0;

  // On-time / late counts based on signals where both expected and actual exist
  const timedSignals = relevant.filter(
    s => s.expected_hours != null && s.actual_hours != null,
  );
  const totalOnTime = timedSignals.filter(
    s => (s.actual_hours as number) <= (s.expected_hours as number),
  ).length;
  const totalLate = timedSignals.filter(
    s => (s.actual_hours as number) > (s.expected_hours as number),
  ).length;

  await ProfileRepo.upsert({
    organization_id: organizationId,
    counterparty_type: counterpartyType,
    counterparty_id: counterpartyId ?? null,
    avg_response_hours: avgResponseHours,
    median_response_hours: medianResponseHours,
    p90_response_hours: p90ResponseHours,
    missed_deadline_rate: missedDeadlineRate,
    follow_up_effectiveness: followUpEffectiveness,
    total_interactions: totalInteractions,
    total_on_time: totalOnTime,
    total_late: totalLate,
    last_updated_at: new Date().toISOString(),
  });

  await LearningEventRepo.create({
    organization_id: organizationId,
    orchestrator_id: null,
    event_type: 'profile_updated',
    detail: {
      counterparty_type: counterpartyType,
      counterparty_id: counterpartyId ?? null,
      avg_response_hours: avgResponseHours,
      missed_deadline_rate: missedDeadlineRate,
      total_interactions: totalInteractions,
    },
    influenced_entity: 'counterparty_profile',
    influenced_entity_id: null,
  });
}

/**
 * Get escalation timing recommendation based on counterparty behavior.
 * Returns adjustment in hours (positive = wait longer, negative = escalate sooner).
 */
export function getEscalationAdjustment(
  profile: OrchestratorCounterpartyProfile | null,
): { adjustmentHours: number; reason: string } {
  if (!profile || profile.total_interactions === 0) {
    return { adjustmentHours: 0, reason: 'No counterparty data available' };
  }

  if (profile.missed_deadline_rate > 0.4) {
    return {
      adjustmentHours: -24,
      reason: `High missed deadline rate (${(profile.missed_deadline_rate * 100).toFixed(0)}%) — escalate 24h sooner`,
    };
  }

  if (profile.missed_deadline_rate > 0.2) {
    return {
      adjustmentHours: -12,
      reason: `Elevated missed deadline rate (${(profile.missed_deadline_rate * 100).toFixed(0)}%) — escalate 12h sooner`,
    };
  }

  if (profile.avg_response_hours != null && profile.avg_response_hours > 72) {
    return {
      adjustmentHours: -12,
      reason: `Slow average response time (${profile.avg_response_hours.toFixed(1)}h) — escalate 12h sooner`,
    };
  }

  if (
    profile.avg_response_hours != null &&
    profile.avg_response_hours < 24 &&
    profile.missed_deadline_rate < 0.1
  ) {
    return {
      adjustmentHours: 12,
      reason: `Fast and reliable counterparty (avg ${profile.avg_response_hours.toFixed(1)}h, ${(profile.missed_deadline_rate * 100).toFixed(0)}% miss rate) — can wait 12h longer`,
    };
  }

  return { adjustmentHours: 0, reason: 'Counterparty behavior within normal range' };
}

/**
 * Get urgency boost based on counterparty behavior.
 * Returns 0-3 urgency boost for slow/unreliable counterparties.
 */
export function getUrgencyBoost(
  profile: OrchestratorCounterpartyProfile | null,
): number {
  if (!profile || profile.total_interactions === 0) {
    return 0;
  }

  if (profile.missed_deadline_rate > 0.5) {
    return 3;
  }

  if (profile.missed_deadline_rate > 0.3) {
    return 2;
  }

  if (profile.p90_response_hours != null && profile.p90_response_hours > 96) {
    return 1;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const frac = idx - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}
