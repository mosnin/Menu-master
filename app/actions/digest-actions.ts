'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import * as digestService from '@/lib/services/digest-service';

export async function updateDigestPreferencesAction(
  isEnabled: boolean,
  deliveryHour?: number,
  timezone?: string,
  includeTransactionSummary?: boolean,
  includeActionItems?: boolean,
  includeUpcomingDeadlines?: boolean,
  includeHealthScores?: boolean,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await digestService.updateDigestPreferences(profile.id, {
      isEnabled,
      deliveryHour,
      timezone,
      includeTransactionSummary,
      includeActionItems,
      includeUpcomingDeadlines,
      includeHealthScores,
    });

    revalidatePath('/settings');
    revalidatePath('/settings/notifications');

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

    const preferences = await digestService.getDigestPreferences(profile.id);
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

    const digest = await digestService.getDigest(profile.id, date);
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

    const preview = await digestService.generateDigestPreview(profile.id);
    return { data: preview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate digest preview' };
  }
}
