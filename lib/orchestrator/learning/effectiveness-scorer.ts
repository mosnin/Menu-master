import * as ActionScoreRepo from '@/lib/repositories/orchestrator-action-scores';
import * as FeedbackRepo from '@/lib/repositories/orchestrator-recommendation-feedback';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type { OutcomeType, OrchestratorActionScore } from '@/types';

/**
 * Upsert the aggregated score row for a tool/context combination,
 * incrementing counters and recalculating effectiveness_score.
 */
export async function updateActionScore(
  orgId: string,
  toolName: string,
  outcomeType: OutcomeType,
  context: {
    entityType?: string;
    stage?: string;
    blockerType?: string;
    counterpartyType?: string;
  } = {},
): Promise<OrchestratorActionScore> {
  const entityType = context.entityType ?? null;
  const stage = context.stage ?? null;
  const blockerType = context.blockerType ?? null;
  const counterpartyType = context.counterpartyType ?? null;

  // Fetch existing scores for this tool + context
  const existing = await ActionScoreRepo.findByToolName(orgId, toolName);
  const match = existing.find(
    s =>
      s.entity_type === entityType &&
      s.stage === stage &&
      s.blocker_type === blockerType &&
      s.counterparty_type === counterpartyType,
  );

  const successful = (match?.successful_outcomes ?? 0) + (isSuccessful(outcomeType) ? 1 : 0);
  const noEffect = (match?.no_effect_outcomes ?? 0) + (isNoEffect(outcomeType) ? 1 : 0);
  const negative = (match?.negative_outcomes ?? 0) + (isNegative(outcomeType) ? 1 : 0);
  const total = successful + noEffect + negative;

  // Weighted formula: (successful * 1.0 + noEffect * 0.0 + negative * -1.0) / total, clamped 0-1
  const rawScore = total > 0 ? (successful * 1.0 + noEffect * 0.0 + negative * -1.0) / total : 0.5;
  const effectivenessScore = Math.max(0, Math.min(1, rawScore));

  const score = await ActionScoreRepo.upsert({
    organization_id: orgId,
    tool_name: toolName,
    entity_type: entityType,
    stage,
    blocker_type: blockerType,
    counterparty_type: counterpartyType,
    total_executions: total,
    successful_outcomes: successful,
    no_effect_outcomes: noEffect,
    negative_outcomes: negative,
    effectiveness_score: effectivenessScore,
    last_updated_at: new Date().toISOString(),
    sample_window_days: 90,
  });

  await LearningEventRepo.create({
    organization_id: orgId,
    orchestrator_id: null,
    event_type: 'score_updated',
    detail: {
      tool_name: toolName,
      outcome_type: outcomeType,
      effectiveness_score: effectivenessScore,
      total_executions: total,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });

  return score;
}

/** Returns all action scores for the org. */
export async function getActionScores(
  orgId: string,
): Promise<OrchestratorActionScore[]> {
  return ActionScoreRepo.findByOrg(orgId);
}

/** Returns the best-context effectiveness score for a given tool. */
export async function getEffectivenessForTool(
  orgId: string,
  toolName: string,
): Promise<number> {
  const scores = await ActionScoreRepo.findByToolName(orgId, toolName);
  if (scores.length === 0) return 0.5; // neutral default
  // Return the highest effectiveness score (best context)
  return Math.max(...scores.map(s => s.effectiveness_score));
}

/**
 * Queries recommendation feedback to find tools with high ignore rates.
 * Returns penalties based on ignore_rate * 0.3 (max 0.3 penalty).
 */
export async function getIgnoredActionPenalties(
  orgId: string,
): Promise<{ tool_name: string; ignore_rate: number; penalty: number }[]> {
  const ignoredPatterns = await FeedbackRepo.findIgnoredPatterns(orgId, 3);

  const penalties: { tool_name: string; ignore_rate: number; penalty: number }[] = [];

  for (const pattern of ignoredPatterns) {
    const counts = await FeedbackRepo.countByFeedbackType(orgId, pattern.tool_name);
    const total =
      counts.accepted +
      counts.ignored +
      counts.dismissed +
      counts.superseded +
      counts.edited;

    if (total === 0) continue;

    const ignoreRate = counts.ignored / total;
    const penalty = Math.min(0.3, ignoreRate * 0.3);

    penalties.push({
      tool_name: pattern.tool_name,
      ignore_rate: ignoreRate,
      penalty,
    });
  }

  await LearningEventRepo.create({
    organization_id: orgId,
    orchestrator_id: null,
    event_type: 'feedback_recorded',
    detail: {
      action: 'computed_ignored_penalties',
      penalty_count: penalties.length,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });

  return penalties;
}

/**
 * Called periodically. Multiplies all counters by decay factor
 * and recalculates scores to prevent stale data from dominating.
 */
export async function applyDecay(
  orgId: string,
  decayFactor = 0.95,
): Promise<void> {
  const scores = await ActionScoreRepo.findByOrg(orgId);

  for (const score of scores) {
    const successful = Math.round(score.successful_outcomes * decayFactor);
    const noEffect = Math.round(score.no_effect_outcomes * decayFactor);
    const negative = Math.round(score.negative_outcomes * decayFactor);
    const total = successful + noEffect + negative;

    const rawScore =
      total > 0 ? (successful * 1.0 + noEffect * 0.0 + negative * -1.0) / total : 0.5;
    const effectivenessScore = Math.max(0, Math.min(1, rawScore));

    await ActionScoreRepo.upsert({
      organization_id: score.organization_id,
      tool_name: score.tool_name,
      entity_type: score.entity_type,
      stage: score.stage,
      blocker_type: score.blocker_type,
      counterparty_type: score.counterparty_type,
      total_executions: total,
      successful_outcomes: successful,
      no_effect_outcomes: noEffect,
      negative_outcomes: negative,
      effectiveness_score: effectivenessScore,
      last_updated_at: new Date().toISOString(),
      sample_window_days: score.sample_window_days,
    });
  }

  await LearningEventRepo.create({
    organization_id: orgId,
    orchestrator_id: null,
    event_type: 'score_updated',
    detail: {
      action: 'decay_applied',
      decay_factor: decayFactor,
      scores_affected: scores.length,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });
}

// --- Helpers ---

function isSuccessful(outcomeType: OutcomeType): boolean {
  return [
    'blocker_resolved',
    'deadline_protected',
    'document_received',
    'approval_completed',
    'response_received',
    'readiness_improved',
    'plan_progressed',
  ].includes(outcomeType);
}

function isNoEffect(outcomeType: OutcomeType): boolean {
  return outcomeType === 'no_meaningful_effect';
}

function isNegative(outcomeType: OutcomeType): boolean {
  return outcomeType === 'negative_effect';
}
