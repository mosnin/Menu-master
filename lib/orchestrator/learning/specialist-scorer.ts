import * as ScoreRepo from '@/lib/repositories/orchestrator-specialist-scores';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type { OrchestratorSpecialistScore } from '@/types';

/**
 * Score a specialist invocation based on whether its findings led to action.
 */
export async function scoreInvocation(params: {
  organizationId: string;
  specialistRole: string;
  entityType?: string;
  stage?: string;
  triggerType?: string;
  wasUseful: boolean;
  findingsLedToAction: boolean;
  findingsImprovedOutcome: boolean;
}): Promise<void> {
  const entityType = params.entityType ?? null;
  const stage = params.stage ?? null;
  const triggerType = params.triggerType ?? null;

  // Fetch existing score row for this specialist + context
  const existing = await ScoreRepo.findByRole(params.organizationId, params.specialistRole);
  const match = existing.find(
    s =>
      s.entity_type === entityType &&
      s.stage === stage &&
      s.trigger_type === triggerType,
  );

  const totalInvocations = (match?.total_invocations ?? 0) + 1;
  const usefulInvocations =
    (match?.useful_invocations ?? 0) + (params.wasUseful ? 1 : 0);
  const findingsLedToAction =
    (match?.findings_led_to_action ?? 0) + (params.findingsLedToAction ? 1 : 0);
  const findingsImprovedOutcome =
    (match?.findings_improved_outcome ?? 0) +
    (params.findingsImprovedOutcome ? 1 : 0);
  const unnecessaryInvocations =
    (match?.unnecessary_invocations ?? 0) + (!params.wasUseful ? 1 : 0);

  // Weighted usefulness score
  const usefulnessScore =
    totalInvocations > 0
      ? (usefulInvocations * 0.5 +
          findingsLedToAction * 0.3 +
          findingsImprovedOutcome * 0.2) /
        totalInvocations
      : 0;

  // Priority adjustment based on usefulness
  const priorityAdjustment = computePriorityAdjustment(usefulnessScore);

  await ScoreRepo.upsert({
    organization_id: params.organizationId,
    specialist_role: params.specialistRole,
    entity_type: entityType,
    stage,
    trigger_type: triggerType,
    total_invocations: totalInvocations,
    useful_invocations: usefulInvocations,
    findings_led_to_action: findingsLedToAction,
    findings_improved_outcome: findingsImprovedOutcome,
    unnecessary_invocations: unnecessaryInvocations,
    usefulness_score: usefulnessScore,
    priority_adjustment: priorityAdjustment,
    last_updated_at: new Date().toISOString(),
  });

  await LearningEventRepo.create({
    organization_id: params.organizationId,
    orchestrator_id: null,
    event_type: 'specialist_scored',
    detail: {
      specialist_role: params.specialistRole,
      entity_type: entityType,
      stage,
      was_useful: params.wasUseful,
      findings_led_to_action: params.findingsLedToAction,
      findings_improved_outcome: params.findingsImprovedOutcome,
      usefulness_score: usefulnessScore,
      priority_adjustment: priorityAdjustment,
      total_invocations: totalInvocations,
    },
    influenced_entity: 'specialist_score',
    influenced_entity_id: null,
  });
}

/**
 * Get routing adjustments for specialists based on historical scores.
 * Returns a map of specialist_role -> priority_adjustment (-3 to +3).
 */
export async function getRoutingAdjustments(
  orgId: string,
): Promise<Map<string, number>> {
  const scores = await ScoreRepo.findWithAdjustments(orgId);
  const adjustments = new Map<string, number>();

  for (const score of scores) {
    const current = adjustments.get(score.specialist_role);
    if (current == null) {
      adjustments.set(score.specialist_role, score.priority_adjustment);
    } else {
      // When multiple context rows exist for the same role, use the most
      // impactful adjustment (largest absolute value).
      if (Math.abs(score.priority_adjustment) > Math.abs(current)) {
        adjustments.set(score.specialist_role, score.priority_adjustment);
      }
    }
  }

  return adjustments;
}

/**
 * Determine if a specialist should be skipped for this context
 * (usefulness_score < 0.2 and total_invocations >= 10).
 */
export async function shouldSkipSpecialist(
  orgId: string,
  role: string,
  entityType?: string,
  stage?: string,
): Promise<{ skip: boolean; reason: string }> {
  const scores = await ScoreRepo.findByRole(orgId, role);

  // Try to find an exact context match first
  const exactMatch = scores.find(
    s =>
      s.entity_type === (entityType ?? null) &&
      s.stage === (stage ?? null),
  );

  const scoreToCheck = exactMatch ?? findBestMatch(scores, entityType, stage);

  if (!scoreToCheck) {
    return { skip: false, reason: 'No scoring data available for this specialist' };
  }

  if (
    scoreToCheck.total_invocations >= 10 &&
    scoreToCheck.usefulness_score < 0.2
  ) {
    return {
      skip: true,
      reason: `Specialist "${role}" has low usefulness (${scoreToCheck.usefulness_score.toFixed(2)}) over ${scoreToCheck.total_invocations} invocations`,
    };
  }

  return {
    skip: false,
    reason: `Specialist "${role}" usefulness ${scoreToCheck.usefulness_score.toFixed(2)} over ${scoreToCheck.total_invocations} invocations — above skip threshold`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computePriorityAdjustment(usefulnessScore: number): number {
  if (usefulnessScore > 0.7) return 2;
  if (usefulnessScore > 0.5) return 1;
  if (usefulnessScore < 0.15) return -2;
  if (usefulnessScore < 0.3) return -1;
  return 0;
}

/**
 * Fall back to the broadest matching score row when no exact context match exists.
 */
function findBestMatch(
  scores: OrchestratorSpecialistScore[],
  entityType?: string,
  stage?: string,
): OrchestratorSpecialistScore | undefined {
  // Prefer a match on entity_type alone
  if (entityType) {
    const byEntity = scores.find(
      s => s.entity_type === entityType && s.stage === null,
    );
    if (byEntity) return byEntity;
  }

  // Fall back to the global (null/null) row with the most invocations
  const global = scores.find(s => s.entity_type === null && s.stage === null);
  if (global) return global;

  // Last resort: return the row with the most invocations
  return scores.length > 0
    ? scores.reduce((best, s) =>
        s.total_invocations > best.total_invocations ? s : best,
      )
    : undefined;
}
