'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import * as notificationService from '@/lib/services/notification-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import type { NotificationCategory } from '@/types';

export async function getNotificationsAction(
  options?: { isRead?: boolean; category?: NotificationCategory; limit?: number; offset?: number },
) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const notifications = await notificationService.getNotifications(profile.id, options);
    return { data: notifications };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get notifications' };
  }
}

export async function getUnreadCountAction(): Promise<{ data?: number; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const count = await notificationService.getUnreadCount(profile.id);
    return { data: count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get unread count' };
  }
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await notificationService.markAsRead(notificationId, profile.id);
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to mark as read' };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await notificationService.markAllAsRead(profile.id);
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to mark all as read' };
  }
}

export async function archiveNotificationAction(
  notificationId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await notificationService.archiveNotification(notificationId, profile.id);
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to archive notification' };
  }
}

export async function getNotificationPreferencesAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const prefs = await notificationService.getPreferences(profile.id, memberships[0].organization_id);
    return { data: prefs };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get preferences' };
  }
}

export async function updateNotificationPreferencesAction(
  preferences: Partial<Record<NotificationCategory, boolean>>,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    await notificationService.updatePreferences(profile.id, memberships[0].organization_id, preferences);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update preferences' };
  }
}
