'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  archiveNotificationAction,
} from '@/app/actions/notification-actions';
import { humanizeStatus, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Archive, Check, CheckCheck, ExternalLink } from 'lucide-react';
import type { Notification } from '@/types';

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-blue-500',
  low: 'border-l-slate-300',
};

interface NotificationListProps {
  initialNotifications: Notification[];
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  async function handleMarkRead(id: string) {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }

  async function handleArchive(id: string) {
    await archiveNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-[12px] h-7"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-[12px] h-7"
          >
            Unread ({unreadCount})
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-[12px] h-7 gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayed.length === 0 ? (
          <p className="text-center py-8 text-[13px] text-muted-foreground/60">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          </p>
        ) : (
          displayed.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'border-l-[3px] transition-colors duration-150',
                priorityColors[n.priority],
                !n.is_read && 'bg-primary/[0.02]',
              )}
            >
              <CardContent className="flex items-start gap-4 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-[13px] truncate', !n.is_read ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {n.body && (
                    <p className="text-[12px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {humanizeStatus(n.category)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground/40">
                      {formatDate(n.created_at, 'relative')}
                    </span>
                    {n.actor_name && (
                      <span className="text-[11px] text-muted-foreground/40">
                        by {n.actor_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleArchive(n.id)}
                    title="Archive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  {n.action_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => router.push(n.action_url!)}
                      title="Open"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
