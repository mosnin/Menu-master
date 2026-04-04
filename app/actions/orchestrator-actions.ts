'use server';

import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
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
// 1. Get orchestrator for an entity
// ---------------------------------------------------------------------------

export async function getOrchestratorAction(
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<{ data?: DealOrchestrator | null; error?: string }> {
  try {
    await requireAuth();
    return { data: await orchestratorService.getOrchestratorForEntity(entityType, entityId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get orchestrator' };
  }
}

// ---------------------------------------------------------------------------
// 2. Get next actions for an orchestrator
// ---------------------------------------------------------------------------

export async function getNextActionsAction(
  orchestratorId: string,
): Promise<{ data?: OrchestratorNextAction[]; error?: string }> {
  try {
    await requireAuth();
    return { data: await nextActionsRepo.findActive(orchestratorId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get next actions' };
  }
}

// ---------------------------------------------------------------------------
// 3. Get recent cycles for an orchestrator
// ---------------------------------------------------------------------------

export async function getRecentCyclesAction(
  orchestratorId: string,
  limit: number = 5,
): Promise<{ data?: OrchestratorCycle[]; error?: string }> {
  try {
    await requireAuth();
    return { data: await cyclesRepo.findByOrchestrator(orchestratorId, limit) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get recent cycles' };
  }
}

// ---------------------------------------------------------------------------
// 4. Get recent executions for an orchestrator
// ---------------------------------------------------------------------------

export async function getRecentExecutionsAction(
  orchestratorId: string,
  limit: number = 10,
): Promise<{ data?: OrchestratorActionExecution[]; error?: string }> {
  try {
    await requireAuth();
    return { data: await actionsRepo.findExecutionsByOrchestrator(orchestratorId, limit) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get recent executions' };
  }
}

// ---------------------------------------------------------------------------
// 5. Pause an orchestrator
// ---------------------------------------------------------------------------

export async function pauseOrchestratorAction(
  orchestratorId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await orchestratorService.pauseOrchestrator(orchestratorId, profile.id);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to pause orchestrator' };
  }
}

// ---------------------------------------------------------------------------
// 6. Resume an orchestrator
// ---------------------------------------------------------------------------

export async function resumeOrchestratorAction(
  orchestratorId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await orchestratorService.resumeOrchestrator(orchestratorId, profile.id);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resume orchestrator' };
  }
}

// ---------------------------------------------------------------------------
// 7. Dismiss a next action
// ---------------------------------------------------------------------------

export async function dismissNextActionAction(
  actionId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    await nextActionsRepo.dismiss(actionId);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to dismiss action' };
  }
}

// ---------------------------------------------------------------------------
// 8. Resolve a next action
// ---------------------------------------------------------------------------

export async function resolveNextActionAction(
  actionId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    await nextActionsRepo.resolve(actionId);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resolve action' };
  }
}

// ---------------------------------------------------------------------------
// 9. Trigger a manual orchestrator cycle
// ---------------------------------------------------------------------------

export async function triggerManualCycleAction(
  orchestratorId: string,
): Promise<{ error?: string }> {
  try {
    await requireAuth();
    const orch = await orchestratorRepo.findById(orchestratorId);
    if (!orch) return { error: 'Orchestrator not found' };
    await emitEntityChanged(orch.entity_type, orch.entity_id, 'manual');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to trigger manual cycle' };
  }
}

// ---------------------------------------------------------------------------
// 10. Get orchestrators by org
// ---------------------------------------------------------------------------

export async function getOrchestratorsByOrgAction(
  orgId: string,
): Promise<{ data?: DealOrchestrator[]; error?: string }> {
  try {
    await requireAuth();
    return { data: await orchestratorService.getOrchestratorsByOrg(orgId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get orchestrators' };
  }
}

// ---------------------------------------------------------------------------
// 11. Ensure orchestrator exists for entity
// ---------------------------------------------------------------------------

export async function ensureOrchestratorAction(
  orgId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<{ data?: DealOrchestrator; error?: string }> {
  try {
    await requireAuth();
    return { data: await orchestratorService.ensureOrchestrator(orgId, entityType, entityId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to ensure orchestrator' };
  }
}

// ---------------------------------------------------------------------------
// 12. Get orchestrator memory
// ---------------------------------------------------------------------------

export async function getOrchestratorMemoryAction(
  orchestratorId: string,
): Promise<{ data?: unknown[]; error?: string }> {
  try {
    await requireAuth();
    return { data: await memoryRepo.findRecent(orchestratorId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get memory' };
  }
}

// ---------------------------------------------------------------------------
// 13. Get latest world state
// ---------------------------------------------------------------------------

export async function getWorldStateAction(
  orchestratorId: string,
): Promise<{ data?: unknown; error?: string }> {
  try {
    await requireAuth();
    return { data: await worldStatesRepo.findLatestByOrchestrator(orchestratorId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get world state' };
  }
}
