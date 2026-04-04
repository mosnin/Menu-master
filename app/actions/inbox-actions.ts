'use server';

import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import * as inboxService from '@/lib/services/inbox-service';
import * as membershipRepo from '@/lib/repositories/memberships';

export async function getInboxItemsAction(
  options?: { limit?: number; offset?: number },
) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const items = await inboxService.getInboxItems(
      profile.id,
      memberships[0].organization_id,
      options,
    );

    return { data: items };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get inbox items' };
  }
}

export async function getInboxCountAction(): Promise<{ data?: number; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const count = await inboxService.getInboxCount(
      profile.id,
      memberships[0].organization_id,
    );

    return { data: count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get inbox count' };
  }
}
