'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as recomputeService from '@/lib/services/recompute-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import type { RecomputeJobType } from '@/types';

export async function createRecomputeJobAction(
  jobType: RecomputeJobType,
  targetEntityType?: string,
  targetEntityId?: string,
): Promise<{ data?: { jobId: string }; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };
    const orgId = memberships[0].organization_id;
    await requireRole(orgId, ['broker_admin']);

    const job = await recomputeService.createRecomputeJob({
      organizationId: orgId,
      userId: profile.id,
      jobType,
      targetEntityType,
      targetEntityId,
    });

    revalidatePath('/admin/diagnostics');
    return { data: { jobId: job.id } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create recompute job' };
  }
}

export async function getRecomputeJobAction(jobId: string) {
  try {
    await requireAuth();
    const job = await recomputeService.getRecomputeJob(jobId);
    return { data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get job' };
  }
}

export async function getRecentRecomputeJobsAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const jobs = await recomputeService.getRecentRecomputeJobs(memberships[0].organization_id);
    return { data: jobs };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get jobs' };
  }
}
