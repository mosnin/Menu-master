'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getNotificationsAction,
  getUnreadCountAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notification-actions';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/format';
import type { Notification } from '@/types';

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-blue-500',
  low: 'bg-slate-400',
};

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    const res = await getUnreadCountAction();
    if (res.data !== undefined) setUnreadCount(res.data);
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) {
      getNotificationsAction({ limit: 10 }).then((res) => {
        if (res.data) setNotifications(res.data);
      });
    }
  }, [open]);

  async function handleMarkRead(id: string) {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function handleClick(notification: Notification) {
    if (!notification.is_read) handleMarkRead(notification.id);
    if (notification.action_url) {
      setOpen(false);
      router.push(notification.action_url);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[9px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <span className="text-[13px] font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                router.push('/notifications');
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              View all
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground/60">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/20 last:border-0',
                  'hover:bg-muted/40 transition-colors duration-100',
                  !n.is_read && 'bg-primary/[0.03]',
                )}
              >
                <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', priorityColors[n.priority])} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] truncate', !n.is_read ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">{n.body}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/40 mt-1">
                    {humanizeStatus(n.category)}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
