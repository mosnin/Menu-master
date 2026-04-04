import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import * as notificationService from '@/lib/services/notification-service';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { NotificationList } from '@/components/notifications/notification-list';

export default async function NotificationsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let notifications: any[] = [];
  let unreadCount = 0;

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const [notifResult, countResult] = await Promise.all([
        notificationService.getNotifications(profile.id, { limit: 50 }),
        notificationService.getUnreadCount(profile.id),
      ]);
      notifications = notifResult;
      unreadCount = countResult;
    }
  } catch {
    // Show empty state
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
            : 'All caught up'
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Notifications about approvals, mentions, overdue items, and system events will appear here."
        />
      ) : (
        <NotificationList initialNotifications={notifications} />
      )}
    </div>
  );
}
