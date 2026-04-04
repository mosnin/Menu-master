import * as bulkActionJobRepo from '@/lib/repositories/bulk-action-jobs';
import { logAction } from '@/lib/audit/logger';
import type { BulkActionJob, BulkActionType } from '@/types';

interface CreateBulkActionInput {
  organizationId: string;
  userId: string;
  actionType: BulkActionType;
  targetEntityType: string;
  targetEntityIds: string[];
  actionParams?: Record<string, unknown>;
}

export async function createBulkAction(
  input: CreateBulkActionInput,
): Promise<BulkActionJob> {
  const job = await bulkActionJobRepo.create({
    organization_id: input.organizationId,
    initiated_by_user_id: input.userId,
    action_type: input.actionType,
    target_entity_type: input.targetEntityType,
    target_entity_ids: input.targetEntityIds,
    action_params: input.actionParams ?? {},
    status: 'pending',
    total_count: input.targetEntityIds.length,
    success_count: 0,
    failure_count: 0,
    results: [],
    error_message: null,
    started_at: null,
    completed_at: null,
  });

  await logAction({
    organizationId: input.organizationId,
    actorType: 'user',
    actorUserId: input.userId,
    action: 'bulk_action.started',
    targetType: 'bulk_action_job',
    targetId: job.id,
    metadata: {
      action_type: input.actionType,
      target_count: input.targetEntityIds.length,
    },
  });

  return job;
}

export async function markJobProcessing(jobId: string): Promise<BulkActionJob> {
  return bulkActionJobRepo.update(jobId, {
    status: 'processing',
    started_at: new Date().toISOString(),
  });
}

export async function markJobCompleted(
  jobId: string,
  results: { successCount: number; failureCount: number; results: Record<string, unknown>[] },
): Promise<BulkActionJob> {
  const status = results.failureCount > 0
    ? (results.successCount > 0 ? 'partial_failure' : 'failed')
    : 'completed';

  const job = await bulkActionJobRepo.update(jobId, {
    status,
    success_count: results.successCount,
    failure_count: results.failureCount,
    results: results.results,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'system',
    action: status === 'failed' ? 'bulk_action.failed' : 'bulk_action.completed',
    targetType: 'bulk_action_job',
    targetId: jobId,
    metadata: {
      success_count: results.successCount,
      failure_count: results.failureCount,
    },
  });

  return job;
}

export async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<BulkActionJob> {
  const job = await bulkActionJobRepo.update(jobId, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'system',
    action: 'bulk_action.failed',
    targetType: 'bulk_action_job',
    targetId: jobId,
    metadata: { error: errorMessage },
  });

  return job;
}

export async function getBulkActionJob(jobId: string): Promise<BulkActionJob | null> {
  return bulkActionJobRepo.findById(jobId);
}

export async function getRecentBulkActions(
  orgId: string,
  limit = 20,
): Promise<BulkActionJob[]> {
  return bulkActionJobRepo.findByOrgId(orgId, { limit });
}
