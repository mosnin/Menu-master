import * as orchestratorRepo from '@/lib/repositories/deal-orchestrators';
import { logAction } from '@/lib/audit/logger';
import type { DealOrchestrator, OrchestratorEntityType } from '@/types';

export async function ensureOrchestrator(
  orgId: string,
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<DealOrchestrator> {
  return orchestratorRepo.upsertByEntity({
    organization_id: orgId,
    entity_type: entityType,
    entity_id: entityId,
    status: 'active',
    priority: 'normal',
    risk_summary: {},
    priority_summary: {},
    last_observed_at: null,
    last_planned_at: null,
    last_executed_at: null,
    last_human_escalation_at: null,
    last_human_escalation_status: null,
    cycle_count: 0,
    config: {},
  });
}

export async function pauseOrchestrator(id: string, userId: string): Promise<DealOrchestrator> {
  const orch = await orchestratorRepo.update(id, { status: 'paused' });
  await logAction({
    organizationId: orch.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'orchestrator.cycle_completed',
    targetType: 'deal_orchestrator',
    targetId: id,
    metadata: { action: 'paused' },
  });
  return orch;
}

export async function resumeOrchestrator(id: string, userId: string): Promise<DealOrchestrator> {
  const orch = await orchestratorRepo.update(id, { status: 'active' });
  await logAction({
    organizationId: orch.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'orchestrator.cycle_started',
    targetType: 'deal_orchestrator',
    targetId: id,
    metadata: { action: 'resumed' },
  });
  return orch;
}

export async function getOrchestratorForEntity(
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<DealOrchestrator | null> {
  return orchestratorRepo.findByEntity(entityType, entityId);
}

export async function getOrchestratorsByOrg(orgId: string): Promise<DealOrchestrator[]> {
  return orchestratorRepo.findActiveByOrgId(orgId);
}
