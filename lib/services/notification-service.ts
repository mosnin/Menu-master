import * as notificationRepo from '@/lib/repositories/notifications';
import * as notificationPrefRepo from '@/lib/repositories/notification-preferences';
import { logAction } from '@/lib/audit/logger';
import type { Notification, NotificationCategory, NotificationPriority } from '@/types';

interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  transactionId?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  dedupKey?: string;
  actorUserId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification | null> {
  // Check dedup — skip if already exists
  if (input.dedupKey) {
    const existing = await notificationRepo.findByDedupKey(input.dedupKey);
    if (existing) return null;
  }

  // Check user preferences — skip if user has disabled this category
  const prefs = await notificationPrefRepo.findByUserAndOrg(
    input.userId,
    input.organizationId,
  );
  if (prefs) {
    const categoryKey = input.category as keyof typeof prefs;
    if (categoryKey in prefs && prefs[categoryKey] === false) {
      return null;
    }
  }

  const notification = await notificationRepo.create({
    organization_id: input.organizationId,
    user_id: input.userId,
    category: input.category,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    transaction_id: input.transactionId ?? null,
    action_url: input.actionUrl ?? null,
    is_read: false,
    read_at: null,
    is_archived: false,
    archived_at: null,
    priority: input.priority ?? 'normal',
    dedup_key: input.dedupKey ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName ?? null,
    metadata: input.metadata ?? {},
  });

  return notification;
}

export async function getNotifications(
  userId: string,
  options?: {
    isRead?: boolean;
    category?: NotificationCategory;
    limit?: number;
    offset?: number;
  },
): Promise<Notification[]> {
  return notificationRepo.findByUserId(userId, options);
}

export async function getUnreadCount(userId: string): Promise<number> {
  return notificationRepo.countUnread(userId);
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await notificationRepo.markAsRead(notificationId);
  await logAction({
    actorType: 'user',
    actorUserId: userId,
    action: 'notification.read',
    targetType: 'notification',
    targetId: notificationId,
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await notificationRepo.markAllAsRead(userId);
}

export async function archiveNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  await notificationRepo.archive(notificationId);
  await logAction({
    actorType: 'user',
    actorUserId: userId,
    action: 'notification.archived',
    targetType: 'notification',
    targetId: notificationId,
  });
}

export async function getPreferences(
  userId: string,
  orgId: string,
) {
  return notificationPrefRepo.findByUserAndOrg(userId, orgId);
}

export async function updatePreferences(
  userId: string,
  orgId: string,
  preferences: Partial<Record<NotificationCategory, boolean>>,
) {
  return notificationPrefRepo.upsert({
    user_id: userId,
    organization_id: orgId,
    approval_assigned: preferences.approval_assigned ?? true,
    mention: preferences.mention ?? true,
    overdue_item: preferences.overdue_item ?? true,
    blocked_transaction: preferences.blocked_transaction ?? true,
    external_upload: preferences.external_upload ?? true,
    compliance_issue: preferences.compliance_issue ?? true,
    processing_failure: preferences.processing_failure ?? true,
    exception_raised: preferences.exception_raised ?? true,
    stage_changed: preferences.stage_changed ?? true,
    document_request_fulfilled: preferences.document_request_fulfilled ?? true,
    policy_override_needed: preferences.policy_override_needed ?? true,
    closing_approaching: preferences.closing_approaching ?? true,
    general: preferences.general ?? true,
  });
}
