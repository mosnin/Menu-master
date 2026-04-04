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
// 13. Get latest world state
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
