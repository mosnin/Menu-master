'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as duplicateService from '@/lib/services/duplicate-detection-service';
import * as membershipRepo from '@/lib/repositories/memberships';

export async function runDuplicateDetectionAction(
  entityType: 'contact' | 'transaction',
): Promise<{ data?: { count: number }; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };
    const orgId = memberships[0].organization_id;
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const candidates = entityType === 'contact'
      ? await duplicateService.detectContactDuplicates(orgId)
      : await duplicateService.detectTransactionDuplicates(orgId);

    revalidatePath('/admin/duplicates');
    return { data: { count: candidates.length } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Detection failed' };
  }
}

export async function resolveDuplicateAction(
  candidateId: string,
  resolution: 'merged' | 'not_duplicate' | 'ignored',
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await duplicateService.resolveDuplicate(candidateId, resolution, profile.id);
    revalidatePath('/admin/duplicates');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resolve duplicate' };
  }
}

export async function getPendingDuplicatesAction(entityType?: string) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const candidates = await duplicateService.getPendingDuplicates(
      memberships[0].organization_id,
      entityType,
    );
    return { data: candidates };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get duplicates' };
  }
}
