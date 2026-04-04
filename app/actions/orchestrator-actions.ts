'use server';

import { requireAuth, requireOrgMembership, requireRole, getActiveOrgId, getCurrentUserProfile } from '@/lib/auth/session';
import { hasMinimumRole } from '@/lib/auth/roles';
import * as orchestratorService from '@/lib/services/orchestrator-service';
import * as orchestratorRepo from '@/lib/repositories/deal-orchestrators';
import * as nextActionsRepo from '@/lib/repositories/orchestrator-next-actions';
import * as cyclesRepo from '@/lib/repositories/orchestrator-cycles';
import * as actionsRepo from '@/lib/repositories/orchestrator-actions';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';
import * as worldStatesRepo from '@/lib/repositories/orchestrator-world-states';
import { emitEntityChanged } from '@/lib/orchestrator/events';
import type {
  DealOrchestrator,
  OrchestratorNextAction,
  OrchestratorCycle,
  OrchestratorActionExecution,
  OrchestratorEntityType,
  OrchestratorOutcome,
  OrchestratorOrgProfile,
  OrchestratorMemorySummary,
  LearningContext,
} from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

type ActionResult<T = undefined> = T extends undefined
  ? { error?: string; authError?: boolean }
  : { data?: T; error?: string; authError?: boolean };

/**
 * Fetch an orchestrator by ID and verify the caller belongs to the same org.
 * Returns the orchestrator or throws with an appropriate error.
 */
async function fetchAndAuthorizeOrchestrator(orchestratorId: string): Promise<DealOrchestrator> {
  const orch = await orchestratorRepo.findById(orchestratorId);
  if (!orch) throw new Error('Orchestrator not found');

  // Verify caller is a member of the orchestrator's org
  await requireOrgMembership(orch.organization_id);
  return orch;
}

// ---------------------------------------------------------------------------
// 1. Get orchestrator for an entity
// ---------------------------------------------------------------------------

export async function getOrchestratorAction(
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<{ data?: DealOrchestrator | null; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(entityId)) {
      return { error: 'Invalid entity ID format' };
    }

    const orch = await orchestratorService.getOrchestratorForEntity(entityType, entityId);

    // If an orchestrator exists, verify org membership
    if (orch) {
      await requireOrgMembership(orch.organization_id);
    }

    return { data: orch };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get orchestrator';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 2. Get next actions for an orchestrator
// ---------------------------------------------------------------------------

export async function getNextActionsAction(
  orchestratorId: string,
): Promise<{ data?: OrchestratorNextAction[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);
    return { data: await nextActionsRepo.findActive(orchestratorId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get next actions';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 3. Get recent cycles for an orchestrator
// ---------------------------------------------------------------------------

export async function getRecentCyclesAction(
  orchestratorId: string,
  limit: number = 5,
): Promise<{ data?: OrchestratorCycle[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);
    return { data: await cyclesRepo.findByOrchestrator(orchestratorId, limit) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent cycles';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 4. Get recent executions for an orchestrator
// ---------------------------------------------------------------------------

export async function getRecentExecutionsAction(
  orchestratorId: string,
  limit: number = 10,
): Promise<{ data?: OrchestratorActionExecution[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);
    return { data: await actionsRepo.findExecutionsByOrchestrator(orchestratorId, limit) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent executions';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 5. Pause an orchestrator
// ---------------------------------------------------------------------------

export async function pauseOrchestratorAction(
  orchestratorId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);

    // Require coordinator+ role to pause
    const { membership } = await requireRole(orch.organization_id, ['coordinator', 'broker_admin']);

    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await orchestratorService.pauseOrchestrator(orchestratorId, profile.id);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pause orchestrator';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active' || message === 'Insufficient permissions';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 6. Resume an orchestrator
// ---------------------------------------------------------------------------

export async function resumeOrchestratorAction(
  orchestratorId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);

    // Require coordinator+ role to resume
    const { membership } = await requireRole(orch.organization_id, ['coordinator', 'broker_admin']);

    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await orchestratorService.resumeOrchestrator(orchestratorId, profile.id);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resume orchestrator';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active' || message === 'Insufficient permissions';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 7. Dismiss a next action
// ---------------------------------------------------------------------------

export async function dismissNextActionAction(
  actionId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(actionId)) {
      return { error: 'Invalid action ID format' };
    }

    // Dismiss returns the updated action which has orchestrator_id —
    // but we need to verify org BEFORE mutating. Look up via the action's
    // orchestrator. Since there's no findById for next actions, we perform
    // the dismiss and then could not roll back. Instead, we use supabase
    // to fetch the action first via a raw select.
    const { supabase } = await import('@/lib/db/client');
    const { data: action, error: fetchError } = await supabase
      .from('orchestrator_next_actions')
      .select('orchestrator_id')
      .eq('id', actionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!action) return { error: 'Action not found' };

    await fetchAndAuthorizeOrchestrator(action.orchestrator_id);
    await nextActionsRepo.dismiss(actionId);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dismiss action';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 8. Resolve a next action
// ---------------------------------------------------------------------------

export async function resolveNextActionAction(
  actionId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(actionId)) {
      return { error: 'Invalid action ID format' };
    }

    const { supabase } = await import('@/lib/db/client');
    const { data: action, error: fetchError } = await supabase
      .from('orchestrator_next_actions')
      .select('orchestrator_id')
      .eq('id', actionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!action) return { error: 'Action not found' };

    await fetchAndAuthorizeOrchestrator(action.orchestrator_id);
    await nextActionsRepo.resolve(actionId);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve action';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 9. Trigger a manual orchestrator cycle
// ---------------------------------------------------------------------------

export async function triggerManualCycleAction(
  orchestratorId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);
    await emitEntityChanged(orch.entity_type, orch.entity_id, 'manual');
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to trigger manual cycle';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 10. Get orchestrators by org
// ---------------------------------------------------------------------------

export async function getOrchestratorsByOrgAction(
  orgId: string,
): Promise<{ data?: DealOrchestrator[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orgId)) {
      return { error: 'Invalid org ID format' };
    }

    // Verify the caller is a member of the requested org
    await requireOrgMembership(orgId);

    return { data: await orchestratorService.getOrchestratorsByOrg(orgId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get orchestrators';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 11. Ensure orchestrator exists for entity
// ---------------------------------------------------------------------------

export async function ensureOrchestratorAction(
  orgId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<{ data?: DealOrchestrator; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orgId)) {
      return { error: 'Invalid org ID format' };
    }
    if (!isValidUUID(entityId)) {
      return { error: 'Invalid entity ID format' };
    }

    // Verify the caller is a member of the target org
    await requireOrgMembership(orgId);

    return { data: await orchestratorService.ensureOrchestrator(orgId, entityType, entityId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ensure orchestrator';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 12. Get orchestrator memory
// ---------------------------------------------------------------------------

export async function getOrchestratorMemoryAction(
  orchestratorId: string,
): Promise<{ data?: unknown[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);
    return { data: await memoryRepo.findRecent(orchestratorId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get memory';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 13. Get execution history with dispositions
// ---------------------------------------------------------------------------

export async function getExecutionHistoryAction(
  orchestratorId: string,
  limit: number = 50,
): Promise<{ data?: unknown[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const { supabase } = await import('@/lib/db/client');
    const { data, error: fetchError } = await supabase
      .from('orchestrator_action_executions')
      .select(`
        id,
        tool_name,
        success,
        error_message,
        result,
        created_at,
        proposal_id,
        orchestrator_action_proposals (
          disposition,
          risk_class,
          reason,
          gated_reason
        )
      `)
      .eq('orchestrator_id', orchestratorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) throw fetchError;

    // Normalize into the shape the UI expects
    const entries = (data ?? []).map((row: Record<string, unknown>) => {
      const proposal = row.orchestrator_action_proposals as Record<string, unknown> | null;
      const disposition = (proposal?.disposition as string) ?? 'auto_execute';
      const resultObj = row.result as Record<string, unknown> | null;

      return {
        id: row.id,
        tool_name: row.tool_name,
        disposition,
        success: row.success,
        result_summary: resultObj?.summary ?? null,
        error_message: row.error_message,
        draft_type: disposition === 'create_draft' ? (resultObj?.draft_type ?? 'Draft') : null,
        blocked_reason: disposition === 'block' ? (proposal?.gated_reason ?? proposal?.reason ?? null) : null,
        blocked_unlocker: disposition === 'block' ? (resultObj?.unblock_role ?? null) : null,
        created_at: row.created_at,
      };
    });

    return { data: entries };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get execution history';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 14. Get follow-through runs
// ---------------------------------------------------------------------------

export async function getFollowThroughRunsAction(
  orchestratorId: string,
): Promise<{ data?: unknown[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const { supabase } = await import('@/lib/db/client');
    const { data, error: fetchError } = await supabase
      .from('orchestrator_follow_through_runs')
      .select('*')
      .eq('orchestrator_id', orchestratorId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    return { data: data ?? [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get follow-through runs';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 15. Cancel a follow-through run
// ---------------------------------------------------------------------------

export async function cancelFollowThroughAction(
  runId: string,
): Promise<{ error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(runId)) {
      return { error: 'Invalid run ID format' };
    }

    const { supabase } = await import('@/lib/db/client');

    // Look up the run to find its orchestrator for authorization
    const { data: run, error: fetchError } = await supabase
      .from('orchestrator_follow_through_runs')
      .select('orchestrator_id, sequence_name, status')
      .eq('id', runId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!run) return { error: 'Follow-through run not found' };

    // Check if sequence allows cancellation
    const { getSequenceByName } = await import('@/lib/orchestrator/follow-through');
    const sequence = getSequenceByName(run.sequence_name);
    if (sequence && !sequence.allows_cancellation) {
      return { error: 'This sequence cannot be cancelled' };
    }

    if (run.status !== 'active' && run.status !== 'waiting') {
      return { error: 'Only active or waiting sequences can be cancelled' };
    }

    await fetchAndAuthorizeOrchestrator(run.orchestrator_id);

    const { error: updateError } = await supabase
      .from('orchestrator_follow_through_runs')
      .update({
        status: 'cancelled',
        exit_reason: 'Manually cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (updateError) throw updateError;
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel follow-through';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 16. Get policy trace for a proposal
// ---------------------------------------------------------------------------

export async function getPolicyTraceAction(
  proposalId: string,
): Promise<{ data?: unknown; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(proposalId)) {
      return { error: 'Invalid proposal ID format' };
    }

    const { supabase } = await import('@/lib/db/client');
    const { data: proposal, error: fetchError } = await supabase
      .from('orchestrator_action_proposals')
      .select(`
        id,
        tool_name,
        risk_class,
        confidence,
        reason,
        disposition,
        policy_rule,
        escalation_target,
        can_override,
        gated_reason,
        orchestrator_id
      `)
      .eq('id', proposalId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!proposal) return { error: 'Proposal not found' };

    await fetchAndAuthorizeOrchestrator(proposal.orchestrator_id);

    return {
      data: {
        tool_name: proposal.tool_name,
        risk_class: proposal.risk_class,
        confidence: proposal.confidence,
        disposition: proposal.disposition,
        policy_rule: proposal.policy_rule ?? 'default',
        reason: proposal.gated_reason ?? proposal.reason,
        escalation_target: proposal.escalation_target,
        can_override: proposal.can_override ?? false,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get policy trace';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 17. Get latest world state
// ---------------------------------------------------------------------------

export async function getWorldStateAction(
  orchestratorId: string,
): Promise<{ data?: unknown; error?: string; authError?: boolean }> {
  try {
    await requireAuth();

    if (!isValidUUID(orchestratorId)) {
      return { error: 'Invalid orchestrator ID format' };
    }

    await fetchAndAuthorizeOrchestrator(orchestratorId);
    return { data: await worldStatesRepo.findLatestByOrchestrator(orchestratorId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get world state';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 18. Get active plan with subgoals and progress
// ---------------------------------------------------------------------------

export async function getActivePlanAction(
  orchestratorId: string,
): Promise<{ data?: { plan: unknown; subgoals: unknown[]; progress: unknown; revisions: unknown[] } | null; error?: string; authError?: boolean }> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const planRepo = await import('@/lib/repositories/orchestrator-plans');
    const subgoalRepo = await import('@/lib/repositories/orchestrator-subgoals');
    const revisionRepo = await import('@/lib/repositories/orchestrator-plan-revisions');

    const plan = await planRepo.findActivePlan(orchestratorId);
    if (!plan) return { data: null };

    const subgoals = await subgoalRepo.findByPlan(plan.id);
    const progress = await subgoalRepo.computeProgress(plan.id);
    const revisions = await revisionRepo.findByPlan(plan.id);

    return { data: { plan, subgoals, progress, revisions: revisions.slice(0, 5) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get active plan';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 19. Get plan history
// ---------------------------------------------------------------------------

export async function getPlanHistoryAction(
  orchestratorId: string,
): Promise<{ data?: unknown[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const planRepo = await import('@/lib/repositories/orchestrator-plans');
    const plans = await planRepo.findByOrchestrator(orchestratorId);
    return { data: plans };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get plan history';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// 20. Get specialist traces
// ---------------------------------------------------------------------------

export async function getSpecialistTracesAction(
  orchestratorId: string,
  limit: number = 10,
): Promise<{ data?: unknown[]; error?: string; authError?: boolean }> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const specialistRepo = await import('@/lib/repositories/orchestrator-specialist-traces');
    const traces = await specialistRepo.findByOrchestrator(orchestratorId, limit);
    return { data: traces };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get specialist traces';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

// ---------------------------------------------------------------------------
// Learning and Adaptation Actions
// ---------------------------------------------------------------------------

export async function getLearningContextAction(
  orchestratorId: string,
): Promise<ActionResult<{ learningContext: LearningContext }>> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);

    const { ContextBuilder } = await import('@/lib/orchestrator/learning');
    const learningContext = await ContextBuilder.buildLearningContext(
      orch.organization_id,
      orchestratorId,
    );
    return { data: { learningContext } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get learning context';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

export async function getOutcomesAction(
  orchestratorId: string,
  limit = 50,
): Promise<ActionResult<{ outcomes: OrchestratorOutcome[] }>> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const outcomeRepo = await import('@/lib/repositories/orchestrator-outcomes');
    const outcomes = await outcomeRepo.findByOrchestrator(orchestratorId, limit);
    return { data: { outcomes } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get outcomes';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

export async function getOrgAdaptationProfileAction(
  orgId: string,
): Promise<ActionResult<{ profile: OrchestratorOrgProfile | null }>> {
  try {
    await requireAuth();
    if (!isValidUUID(orgId)) return { error: 'Invalid org ID format' };
    await requireOrgMembership(orgId);

    const profileRepo = await import('@/lib/repositories/orchestrator-org-profiles');
    const profile = await profileRepo.findByOrg(orgId);
    return { data: { profile } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get org profile';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

export async function getMemorySummariesAction(
  orchestratorId: string,
): Promise<ActionResult<{ summaries: OrchestratorMemorySummary[] }>> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    await fetchAndAuthorizeOrchestrator(orchestratorId);

    const summaryRepo = await import('@/lib/repositories/orchestrator-memory-summaries');
    const summaries = await summaryRepo.findByOrchestrator(orchestratorId, true, 20);
    return { data: { summaries } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get memory summaries';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

export async function recordRecommendationFeedbackAction(
  orchestratorId: string,
  feedbackData: {
    proposalId?: string;
    nextActionId?: string;
    toolName: string;
    recommendationType: string;
    feedbackType: 'accepted' | 'ignored' | 'dismissed' | 'superseded' | 'edited';
    editSummary?: string;
    entityType?: string;
    stage?: string;
  },
): Promise<ActionResult> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);

    const feedbackRepo = await import('@/lib/repositories/orchestrator-recommendation-feedback');
    await feedbackRepo.create({
      organization_id: orch.organization_id,
      orchestrator_id: orchestratorId,
      proposal_id: feedbackData.proposalId ?? null,
      next_action_id: feedbackData.nextActionId ?? null,
      tool_name: feedbackData.toolName,
      recommendation_type: feedbackData.recommendationType,
      feedback_type: feedbackData.feedbackType,
      edit_summary: feedbackData.editSummary ?? null,
      entity_type: feedbackData.entityType ?? null,
      stage: feedbackData.stage ?? null,
    });
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record feedback';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

export async function triggerMemoryCompactionAction(
  orchestratorId: string,
): Promise<ActionResult<{ summariesCreated: number; memoriesCompacted: number }>> {
  try {
    await requireAuth();
    if (!isValidUUID(orchestratorId)) return { error: 'Invalid orchestrator ID format' };
    const orch = await fetchAndAuthorizeOrchestrator(orchestratorId);

    // Require at least coordinator role for compaction
    await requireRole(orch.organization_id, ['coordinator', 'broker_admin']);

    const { MemoryCompactor } = await import('@/lib/orchestrator/learning');
    const result = await MemoryCompactor.compactMemory(orch.organization_id, orchestratorId);
    return { data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compact memory';
    const isAuth = message === 'Unauthorized' || message === 'Not a member of this organization' || message === 'Membership is not active';
    return { error: message, authError: isAuth };
  }
}

