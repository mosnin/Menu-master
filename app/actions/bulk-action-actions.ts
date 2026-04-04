'use server';

import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as bulkActionService from '@/lib/services/bulk-action-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import type { BulkActionType } from '@/types';

export async function createBulkActionAction(
  actionType: BulkActionType,
  targetEntityType: string,
  targetEntityIds: string[],
  actionParams?: Record<string, unknown>,
): Promise<{ data?: { jobId: string }; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const orgId = memberships[0].organization_id;
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const job = await bulkActionService.createBulkAction({
      organizationId: orgId,
      userId: profile.id,
      actionType,
      targetEntityType,
      targetEntityIds,
      actionParams,
    });

    return { data: { jobId: job.id } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create bulk action' };
  }
}

export async function getBulkActionStatusAction(
  jobId: string,
) {
  try {
    await requireAuth();
    const job = await bulkActionService.getBulkActionJob(jobId);
    if (!job) return { error: 'Job not found' };

    return { data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get job status' };
  }
}

export async function getRecentBulkActionsAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const jobs = await bulkActionService.getRecentBulkActions(memberships[0].organization_id);
    return { data: jobs };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get bulk actions' };
  }
}
