import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  ClipboardList,
  Eye,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { QueueItemCard } from '@/components/queue/queue-item-card';
import type { QueueItem } from '@/components/queue/queue-item-card';

async function getQueueData(orgId: string, userId: string) {
  const now = new Date().toISOString();

  const [assignedChecklistRes, reviewChecklistRes, pendingApprovalsRes, overdueRes] =
    await Promise.all([
      // My Assigned Items — checklist items assigned to this user
      supabase
        .from('checklist_items')
        .select('*, transactions(id, title)')
        .eq('assigned_to_user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(25),

      // Needs Review — checklist items flagged for review
      supabase
        .from('checklist_items')
        .select('*, transactions(id, title)')
        .eq('requires_review', true)
        .eq('status', 'needs_review')
        .order('created_at', { ascending: false })
        .limit(25),

      // Pending approvals for this org
      supabase
        .from('approvals')
        .select('*, transactions(id, title)')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(25),

      // Overdue checklist items across org transactions
      supabase
        .from('checklist_items')
        .select('*, transactions(id, title, organization_id)')
        .lt('due_date', now)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(25),
    ]);

  return {
    assigned: (assignedChecklistRes.data ?? []) as Array<Record<string, unknown>>,
    needsReview: (reviewChecklistRes.data ?? []) as Array<Record<string, unknown>>,
    pendingApprovals: (pendingApprovalsRes.data ?? []) as Array<Record<string, unknown>>,
    overdue: (overdueRes.data ?? []) as Array<Record<string, unknown>>,
  };
}

function mapChecklistToQueueItem(
  item: Record<string, unknown>,
  priority: 'normal' | 'overdue' | 'needs_review' = 'normal',
): QueueItem {
  const tx = item.transactions as Record<string, unknown> | null;
  return {
    id: item.id as string,
    type: 'checklist',
    title: item.title as string,
    transactionId: tx?.id as string ?? item.transaction_id as string,
    transactionTitle: tx?.title as string ?? 'Unknown Transaction',
    dueDate: item.due_date as string | null,
    assignedUserName: null,
    status: item.status as string,
    priority,
  };
}

function mapApprovalToQueueItem(item: Record<string, unknown>): QueueItem {
  const tx = item.transactions as Record<string, unknown> | null;
  return {
    id: item.id as string,
    type: 'approval',
    title: (item.approval_type as string).replace(/_/g, ' '),
    transactionId: tx?.id as string ?? item.transaction_id as string,
    transactionTitle: tx?.title as string ?? 'Unknown Transaction',
    dueDate: null,
    assignedUserName: null,
    status: item.status as string,
    priority: 'needs_review',
  };
}

export default async function QueuePage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let orgId: string | null = null;
  let userId: string | null = null;

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      userId = profile.id;
      if (profile.memberships?.[0]?.organization_id) {
        orgId = profile.memberships[0].organization_id;
      }
    }
  } catch {
    // If profile fetch fails, show empty state
  }

  const data = orgId && userId ? await getQueueData(orgId, userId) : null;

  const assignedItems = (data?.assigned ?? []).map((i) => mapChecklistToQueueItem(i));
  const needsReviewItems = [
    ...(data?.needsReview ?? []).map((i) => mapChecklistToQueueItem(i, 'needs_review')),
    ...(data?.pendingApprovals ?? []).map(mapApprovalToQueueItem),
  ];
  const overdueItems = (data?.overdue ?? []).map((i) => mapChecklistToQueueItem(i, 'overdue'));

  const totalCount = assignedItems.length + needsReviewItems.length + overdueItems.length;

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="pt-2 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight">Work Queue</h1>
        <p className="text-muted-foreground mt-2 text-base leading-relaxed">
          {totalCount > 0 ? (
            <>
              You have{' '}
              <span className="font-medium text-foreground">{totalCount} items</span>{' '}
              needing your attention.
            </>
          ) : (
            'Items needing your attention will appear here.'
          )}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-l-4 border-l-blue-400 shadow-sm">
          <CardContent className="p-7">
            <div className="flex items-center gap-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned to Me</p>
                <p className="text-3xl font-semibold tracking-tight mt-0.5">
                  {assignedItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-amber-400 shadow-sm">
          <CardContent className="p-7">
            <div className="flex items-center gap-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-3xl font-semibold tracking-tight mt-0.5">
                  {needsReviewItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-red-400 shadow-sm">
          <CardContent className="p-7">
            <div className="flex items-center gap-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100/80 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-semibold tracking-tight mt-0.5 text-red-600 dark:text-red-400">
                  {overdueItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {/* My Assigned Items */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">My Assigned Items</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Checklist items and tasks assigned to you
                </p>
              </div>
            </div>
            <Link
              href="/transactions"
              className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {assignedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-5 dark:bg-green-950/40 dark:text-green-400">
                <Inbox className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">No assigned items</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                When checklist items or tasks are assigned to you, they will appear here for easy tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedItems.map((item) => (
                <QueueItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Needs Review */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Needs Review</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Items flagged for review and pending approvals
                </p>
              </div>
            </div>
            <Link
              href="/approvals"
              className="text-sm text-primary hover:underline transition-colors duration-150 flex items-center gap-1"
            >
              View approvals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {needsReviewItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-5 dark:bg-green-950/40 dark:text-green-400">
                <Eye className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">Nothing to review</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Checklist items requiring review and pending approval requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {needsReviewItems.map((item) => (
                <QueueItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Overdue */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Overdue</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Past-due items across all transactions
                </p>
              </div>
            </div>
          </div>

          {overdueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-5 dark:bg-green-950/40 dark:text-green-400">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">Nothing overdue</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Great work! All items are on track. Overdue checklist items will appear here if deadlines are missed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueItems.map((item) => (
                <QueueItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
