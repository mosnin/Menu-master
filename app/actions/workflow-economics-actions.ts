'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, requireAuth, requireOrgMembership, requireRole } from '@/lib/auth/session';
import { buildAutomationEconomics, getEconomicsOverview } from '@/lib/services/workflow-economics-service';

export async function getAutomationEconomicsOverviewAction(orgId: string) {
  try {
    await requireAuth();
    await requireOrgMembership(orgId);
    const overview = await getEconomicsOverview(orgId);
    return { overview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load automation economics overview' };
  }
}

export async function computeAutomationEconomicsAction(orgId: string, windowDays = 30) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };
    await requireRole(orgId, ['broker_admin']);

    const computed = await buildAutomationEconomics({ orgId, windowDays });
    revalidatePath('/ops/automation-economics');
    return { computed };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compute automation economics' };
  }
}
