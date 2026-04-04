import * as OutcomeRepo from '@/lib/repositories/orchestrator-outcomes';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type { OutcomeType, OrchestratorOutcome } from '@/types';

/**
 * Record an outcome for an action/execution/plan.
 * Called after world state changes are detected post-execution.
 */
export async function recordOutcome(params: {
  organizationId: string;
  orchestratorId: string;
  cycleId?: string;
  proposalId?: string;
  executionId?: string;
  planId?: string;
  specialistTraceId?: string;
  outcomeType: OutcomeType;
  outcomeDetail?: string;
  contextEntityType: string;
  contextEntityId: string;
  contextStage?: string;
  contextCompletenessScore?: number;
  actionAt?: string;
  impactScore?: number;
}): Promise<OrchestratorOutcome> {
  const actionAt = params.actionAt ? new Date(params.actionAt) : null;
  const now = new Date();
  const latencyHours = actionAt
    ? (now.getTime() - actionAt.getTime()) / (1000 * 60 * 60)
    : null;

  const outcome = await OutcomeRepo.create({
    organization_id: params.organizationId,
    orchestrator_id: params.orchestratorId,
    cycle_id: params.cycleId ?? null,
    proposal_id: params.proposalId ?? null,
    execution_id: params.executionId ?? null,
    plan_id: params.planId ?? null,
    specialist_trace_id: params.specialistTraceId ?? null,
    outcome_type: params.outcomeType,
    outcome_detail: params.outcomeDetail ?? null,
    context_entity_type: params.contextEntityType,
    context_entity_id: params.contextEntityId,
    context_stage: params.contextStage ?? null,
    context_completeness_score: params.contextCompletenessScore ?? null,
    action_at: params.actionAt ?? null,
    latency_hours: latencyHours,
    impact_score: params.impactScore ?? getDefaultImpactScore(params.outcomeType),
  });

  await LearningEventRepo.create({
    organization_id: params.organizationId,
    orchestrator_id: params.orchestratorId,
    event_type: 'outcome_recorded',
    detail: {
      outcome_type: params.outcomeType,
      proposal_id: params.proposalId,
      execution_id: params.executionId,
      impact_score: outcome.impact_score,
    },
    influenced_entity: null,
    influenced_entity_id: null,
  });

  return outcome;
}

/**
 * Detect outcomes by comparing world state before/after.
 * Called by the decision pipeline after execution.
 */
export function detectOutcomes(
  before: {
    completeness_score: number;
    missing_docs: string[];
    unresolved_exceptions: number;
    pending_approvals: number;
    overdue_obligations: number;
  },
  after: {
    completeness_score: number;
    missing_docs: string[];
    unresolved_exceptions: number;
    pending_approvals: number;
    overdue_obligations: number;
  },
): { outcomeType: OutcomeType; detail: string }[] {
  const outcomes: { outcomeType: OutcomeType; detail: string }[] = [];

  // Document received
  const newDocs = before.missing_docs.filter(d => !after.missing_docs.includes(d));
  if (newDocs.length > 0) {
    outcomes.push({
      outcomeType: 'document_received',
      detail: `Documents received: ${newDocs.join(', ')}`,
    });
  }

  // Blocker resolved (exceptions decreased)
  if (after.unresolved_exceptions < before.unresolved_exceptions) {
    outcomes.push({
      outcomeType: 'blocker_resolved',
      detail: `Exceptions reduced from ${before.unresolved_exceptions} to ${after.unresolved_exceptions}`,
    });
  }

  // Approval completed
  if (after.pending_approvals < before.pending_approvals) {
    outcomes.push({
      outcomeType: 'approval_completed',
      detail: `Approvals completed: ${before.pending_approvals - after.pending_approvals}`,
    });
  }

  // Readiness improved
  if (after.completeness_score > before.completeness_score + 5) {
    outcomes.push({
      outcomeType: 'readiness_improved',
      detail: `Completeness improved from ${before.completeness_score}% to ${after.completeness_score}%`,
    });
  }

  // Overdue obligations resolved
  if (after.overdue_obligations < before.overdue_obligations) {
    outcomes.push({
      outcomeType: 'response_received',
      detail: `Overdue obligations reduced from ${before.overdue_obligations} to ${after.overdue_obligations}`,
    });
  }

  // No meaningful effect if nothing changed
  if (outcomes.length === 0) {
    const anyChange =
      before.completeness_score !== after.completeness_score ||
      before.missing_docs.length !== after.missing_docs.length ||
      before.unresolved_exceptions !== after.unresolved_exceptions ||
      before.pending_approvals !== after.pending_approvals ||
      before.overdue_obligations !== after.overdue_obligations;
    if (!anyChange) {
      outcomes.push({
        outcomeType: 'no_meaningful_effect',
        detail: 'No measurable state change detected',
      });
    }
  }

  return outcomes;
}

function getDefaultImpactScore(outcomeType: OutcomeType): number {
  const scores: Record<OutcomeType, number> = {
    blocker_resolved: 0.8,
    deadline_protected: 0.9,
    document_received: 0.7,
    approval_completed: 0.7,
    response_received: 0.5,
    readiness_improved: 0.6,
    plan_progressed: 0.4,
    no_meaningful_effect: 0,
    negative_effect: -0.5,
  };
  return scores[outcomeType];
}
