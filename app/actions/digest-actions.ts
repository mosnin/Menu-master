'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import * as digestService from '@/lib/services/digest-service';

export async function updateDigestPreferencesAction(
  isEnabled: boolean,
  deliveryHour?: number,
  timezone?: string,
  includeDeadlines?: boolean,
  includeHealthRisks?: boolean,
  includePendingApprovals?: boolean,
  includeStaleResponses?: boolean,
  includeClosingSoon?: boolean,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'No organization found' };

    await digestService.updatePreferences(profile.id, orgId, {
      is_enabled: isEnabled,
      delivery_hour: deliveryHour,
      timezone,
      include_deadlines: includeDeadlines,
      include_health_risks: includeHealthRisks,
      include_pending_approvals: includePendingApprovals,
      include_stale_responses: includeStaleResponses,
      include_closing_soon: includeClosingSoon,
    });

    revalidatePath('/settings');
    revalidatePath('/settings/digests');

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update digest preferences' };
  }
}

export async function getDigestPreferencesAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const preferences = await digestService.getPreferences(profile.id);
    return { data: preferences };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get digest preferences' };
  }
}

export async function getDigestAction(
  date?: string,
) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const digest = await digestService.getDigest(profile.id, targetDate);
    return { data: digest };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get digest' };
  }
}

export async function generateDigestPreviewAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'No organization found' };

    const preview = await digestService.generateDigest(profile.id, orgId);
    return { data: preview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate digest preview' };
  }
}
