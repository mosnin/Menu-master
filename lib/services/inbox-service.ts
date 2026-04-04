import { supabase } from '@/lib/db/client';

export interface InboxItem {
  id: string;
  type: 'approval' | 'checklist_item' | 'overdue_item' | 'mention' | 'document_review' | 'compliance_issue';
  title: string;
  description: string | null;
  transaction_id: string | null;
  transaction_title: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
  action_url: string;
  entity_id: string;
}

export async function getInboxItems(
  userId: string,
  orgId: string,
  options?: { limit?: number; offset?: number },
): Promise<InboxItem[]> {
  const limit = options?.limit ?? 50;
  const items: InboxItem[] = [];

  // 1. Pending approvals assigned to user
  const { data: approvals } = await supabase
    .from('approvals')
    .select('id, approval_type, status, transaction_id, created_at, payload_json, transactions(title)')
    .eq('organization_id', orgId)
    .eq('assigned_reviewer_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (approvals) {
    for (const a of approvals) {
      const txn = a.transactions as any;
      items.push({
        id: `approval-${a.id}`,
        type: 'approval',
        title: `Review ${a.approval_type.replace(/_/g, ' ')}`,
        description: null,
        transaction_id: a.transaction_id,
        transaction_title: txn?.title ?? null,
        priority: 'high',
        due_date: null,
        created_at: a.created_at,
        action_url: `/transactions/${a.transaction_id}/approvals`,
        entity_id: a.id,
      });
    }
  }

  // 2. Checklist items assigned to user that are pending/in_progress
  const { data: checklistItems } = await supabase
    .from('checklist_items')
    .select('id, title, description, due_date, status, transaction_id, created_at, transactions(title)')
    .eq('assigned_to_user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (checklistItems) {
    const now = new Date();
    for (const item of checklistItems) {
      const txn = item.transactions as any;
      const isOverdue = item.due_date && new Date(item.due_date) < now;
      items.push({
        id: `checklist-${item.id}`,
        type: isOverdue ? 'overdue_item' : 'checklist_item',
        title: item.title,
        description: item.description,
        transaction_id: item.transaction_id,
        transaction_title: txn?.title ?? null,
        priority: isOverdue ? 'urgent' : 'normal',
        due_date: item.due_date,
        created_at: item.created_at,
        action_url: `/transactions/${item.transaction_id}/checklist`,
        entity_id: item.id,
      });
    }
  }

  // 3. Unread mentions
  const { data: mentions } = await supabase
    .from('mentions')
    .select('id, comment_id, is_read, created_at, comments(id, body, transaction_id, entity_type, transactions(title))')
    .eq('mentioned_user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mentions) {
    for (const m of mentions) {
      const comment = m.comments as any;
      const txn = comment?.transactions as any;
      items.push({
        id: `mention-${m.id}`,
        type: 'mention',
        title: 'You were mentioned',
        description: comment?.body?.slice(0, 120) ?? null,
        transaction_id: comment?.transaction_id ?? null,
        transaction_title: txn?.title ?? null,
        priority: 'normal',
        due_date: null,
        created_at: m.created_at,
        action_url: comment?.transaction_id
          ? `/transactions/${comment.transaction_id}/overview`
          : '#',
        entity_id: m.comment_id,
      });
    }
  }

  // 4. Compliance issues assigned to user
  const { data: complianceIssues } = await supabase
    .from('compliance_issues')
    .select('id, title, description, severity, status, transaction_id, created_at, transactions(title)')
    .eq('organization_id', orgId)
    .eq('assigned_to_user_id', userId)
    .in('status', ['open', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (complianceIssues) {
    for (const issue of complianceIssues) {
      const txn = issue.transactions as any;
      items.push({
        id: `compliance-${issue.id}`,
        type: 'compliance_issue',
        title: issue.title,
        description: issue.description,
        transaction_id: issue.transaction_id,
        transaction_title: txn?.title ?? null,
        priority: issue.severity === 'critical' ? 'urgent' : 'high',
        due_date: null,
        created_at: issue.created_at,
        action_url: `/transactions/${issue.transaction_id}/overview`,
        entity_id: issue.id,
      });
    }
  }

  // Sort by priority then created_at
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  items.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return items.slice(0, limit);
}

export async function getInboxCount(
  userId: string,
  orgId: string,
): Promise<number> {
  // Quick count: pending approvals + assigned checklist items
  const [approvalCount, checklistCount] = await Promise.all([
    supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('assigned_reviewer_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to_user_id', userId)
      .in('status', ['pending', 'in_progress']),
  ]);

  return (approvalCount.count ?? 0) + (checklistCount.count ?? 0);
}
