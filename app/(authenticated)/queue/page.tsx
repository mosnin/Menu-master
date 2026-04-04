import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import {
  Inbox,
  ClipboardList,
  Eye,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
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
    title: ((item.approval_type as string) ?? 'approval').replace(/_/g, ' '),
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
      <PageHeader
        title="Work Queue"
        description={totalCount > 0
          ? `You have ${totalCount} items needing your attention.`
          : 'Items needing your attention will appear here.'
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Assigned to Me" value={assignedItems.length} icon={ClipboardList} accent="blue" />
        <StatCard label="Needs Review" value={needsReviewItems.length} icon={Eye} accent="amber" />
        <StatCard label="Overdue" value={overdueItems.length} icon={AlertTriangle} accent="red" />
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {/* My Assigned Items */}
        <section>
          <SectionHeader
            icon={ClipboardList}
            iconClassName="text-blue-600 dark:text-blue-400"
            title="My Assigned Items"
            description="Checklist items and tasks assigned to you"
            linkHref="/transactions"
            className="mb-5"
          />

          {assignedItems.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No assigned items"
              description="When checklist items or tasks are assigned to you, they will appear here for easy tracking."
            />
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
          <SectionHeader
            icon={Eye}
            iconClassName="text-amber-600 dark:text-amber-400"
            title="Needs Review"
            description="Items flagged for review and pending approvals"
            linkHref="/approvals"
            linkLabel="View approvals"
            className="mb-5"
          />

          {needsReviewItems.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="Nothing to review"
              description="Checklist items requiring review and pending approval requests will appear here."
            />
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
          <SectionHeader
            icon={AlertTriangle}
            iconClassName="text-red-600 dark:text-red-400"
            title="Overdue"
            description="Past-due items across all transactions"
            className="mb-5"
          />

          {overdueItems.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nothing overdue"
              description="Great work! All items are on track. Overdue checklist items will appear here if deadlines are missed."
            />
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
