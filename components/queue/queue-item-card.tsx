'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  ShieldCheck,
  FileText,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type QueueItemType = 'checklist' | 'approval' | 'document';
export type QueueItemPriority = 'normal' | 'overdue' | 'needs_review';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  title: string;
  transactionId: string;
  transactionTitle: string;
  dueDate: string | null;
  assignedUserName: string | null;
  status: string;
  priority: QueueItemPriority;
}

const typeConfig: Record<QueueItemType, { icon: typeof CheckSquare; label: string; color: string; bg: string }> = {
  checklist: {
    icon: CheckSquare,
    label: 'Checklist',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  approval: {
    icon: ShieldCheck,
    label: 'Approval',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  document: {
    icon: FileText,
    label: 'Document',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
  },
};

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
  pending: 'warning',
  in_progress: 'default',
  needs_review: 'destructive',
  completed: 'success',
  approved: 'success',
  rejected: 'destructive',
};

function formatDueDate(dateStr: string | null): { label: string; isOverdue: boolean } {
  if (!dateStr) return { label: 'No due date', isOverdue: false };

  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
  }
  if (diffDays === 0) {
    return { label: 'Due today', isOverdue: false };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', isOverdue: false };
  }
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, isOverdue: false };
  }
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isOverdue: false,
  };
}

export function QueueItemCard({ item }: { item: QueueItem }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  const due = formatDueDate(item.dueDate);
  const isOverdue = item.priority === 'overdue' || due.isOverdue;
  const badgeVariant = statusVariant[item.status] ?? 'secondary';

  return (
    <Link href={`/transactions/${item.transactionId}`} className="group block">
      <Card
        className={cn(
          'rounded-xl transition-all duration-200 group-hover:shadow-md',
          isOverdue && 'border-l-4 border-l-red-400',
          item.priority === 'needs_review' && !isOverdue && 'border-l-4 border-l-amber-400',
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Type icon */}
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', config.bg)}>
              <Icon className={cn('h-[18px] w-[18px]', config.color)} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight truncate group-hover:text-primary transition-colors duration-150">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {item.transactionTitle}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </p>
                </div>

                <Badge variant={badgeVariant} className="shrink-0 text-xs px-2.5 py-0.5">
                  {item.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5',
                      config.bg,
                    )}
                  >
                    <Icon className={cn('h-3 w-3', config.color)} />
                    <span className={config.color}>{config.label}</span>
                  </span>
                </span>

                {item.dueDate && (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : '',
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {due.label}
                  </span>
                )}

                {item.assignedUserName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.assignedUserName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
