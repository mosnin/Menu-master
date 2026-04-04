import * as recomputeJobRepo from '@/lib/repositories/recompute-jobs';
import { logAction } from '@/lib/audit/logger';
import type { RecomputeJob, RecomputeJobType } from '@/types';

export async function createRecomputeJob(input: {
  organizationId: string;
  userId: string;
  jobType: RecomputeJobType;
  targetEntityType?: string;
  targetEntityId?: string;
}): Promise<RecomputeJob> {
  const job = await recomputeJobRepo.create({
    organization_id: input.organizationId,
    initiated_by_user_id: input.userId,
    job_type: input.jobType,
    target_entity_type: input.targetEntityType ?? null,
    target_entity_id: input.targetEntityId ?? null,
    status: 'pending',
    result_summary: {},
    error_message: null,
    started_at: null,
    completed_at: null,
  });

  await logAction({
    organizationId: input.organizationId,
    actorType: 'user',
    actorUserId: input.userId,
    action: 'recompute.started',
    targetType: 'recompute_job',
    targetId: job.id,
    metadata: { job_type: input.jobType, target: input.targetEntityId },
  });

  return job;
}

export async function markJobProcessing(jobId: string): Promise<RecomputeJob> {
  return recomputeJobRepo.update(jobId, {
    status: 'processing',
    started_at: new Date().toISOString(),
  });
}

export async function markJobCompleted(
  jobId: string,
  resultSummary: Record<string, unknown>,
): Promise<RecomputeJob> {
  const job = await recomputeJobRepo.update(jobId, {
    status: 'completed',
    result_summary: resultSummary,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'system',
    action: 'recompute.completed',
    targetType: 'recompute_job',
    targetId: jobId,
    metadata: resultSummary,
  });

  return job;
}

export async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<RecomputeJob> {
  const job = await recomputeJobRepo.update(jobId, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'system',
    action: 'recompute.failed',
    targetType: 'recompute_job',
    targetId: jobId,
    metadata: { error: errorMessage },
  });

  return job;
}

export async function getRecomputeJob(jobId: string): Promise<RecomputeJob | null> {
  return recomputeJobRepo.findById(jobId);
}

export async function getRecentRecomputeJobs(
  orgId: string,
  limit = 20,
): Promise<RecomputeJob[]> {
  return recomputeJobRepo.findByOrgId(orgId, { limit });
}
