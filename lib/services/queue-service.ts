import { supabase } from '@/lib/db/client';
import * as queueViewRepo from '@/lib/repositories/queue-views';
import { logAction } from '@/lib/audit/logger';
import type {
  ChecklistItem,
  Approval,
  TransactionAssignment,
  QueueView,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MyQueueResult {
  assignedChecklistItems: ChecklistItem[];
  assignedApprovals: Approval[];
  assignedTransactions: TransactionAssignment[];
}

interface OrgQueueFilters {
  status?: string;
  assigneeId?: string;
  type?: 'checklist_item' | 'approval' | 'transaction';
}

interface OrgQueueItem {
  kind: 'checklist_item' | 'approval' | 'transaction';
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
  transaction_id: string;
  due_date: string | null;
  created_at: string;
  raw: Record<string, unknown>;
}

interface QueueStats {
  pendingApprovals: number;
  overdueChecklistItems: number;
  unassignedTransactions: number;
  documentsProcessing: number;
}

// ---------------------------------------------------------------------------
// getMyQueue
// ---------------------------------------------------------------------------

/**
 * Returns the items that need a specific user's attention:
 *  - checklist items assigned to them (not completed / skipped)
 *  - approvals assigned to them as reviewer (still pending)
 *  - transactions where they hold any assignment role
 */
export async function getMyQueue(
  userId: string,
  orgId: string,
): Promise<MyQueueResult> {
  // Checklist items assigned to user that are not done
  const { data: checklistItems, error: clErr } = await supabase
    .from('checklist_items')
    .select('*, transactions!inner(organization_id)')
    .eq('assigned_to_user_id', userId)
    .eq('transactions.organization_id', orgId)
    .not('status', 'in', '("completed","skipped")')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (clErr) throw new Error(`Failed to fetch checklist items: ${clErr.message}`);

  // Approvals assigned to user as reviewer, still pending
  const { data: approvals, error: apErr } = await supabase
    .from('approvals')
    .select('*')
    .eq('assigned_reviewer_id', userId)
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (apErr) throw new Error(`Failed to fetch approvals: ${apErr.message}`);

  // Transactions assigned to user in any role
  const { data: assignments, error: asErr } = await supabase
    .from('transaction_assignments')
    .select('*, transactions!inner(organization_id, title, status)')
    .eq('transactions.organization_id', orgId)
    .or(
      `primary_agent_id.eq.${userId},coordinator_owner_id.eq.${userId},broker_reviewer_id.eq.${userId}`,
    )
    .order('updated_at', { ascending: false });

  if (asErr) throw new Error(`Failed to fetch user assignments: ${asErr.message}`);

  return {
    assignedChecklistItems: (checklistItems ?? []) as ChecklistItem[],
    assignedApprovals: (approvals ?? []) as Approval[],
    assignedTransactions: (assignments ?? []) as TransactionAssignment[],
  };
}

// ---------------------------------------------------------------------------
// getOrgQueue
// ---------------------------------------------------------------------------

/**
 * Returns an org-wide work queue. Each item is normalised into a common shape
 * so the UI can render a single list. Optional filters narrow the results.
 */
export async function getOrgQueue(
  orgId: string,
  filters?: OrgQueueFilters,
): Promise<OrgQueueItem[]> {
  const items: OrgQueueItem[] = [];
  const wantType = filters?.type;

  // --- Checklist items ---
  if (!wantType || wantType === 'checklist_item') {
    let clQuery = supabase
      .from('checklist_items')
      .select('*, transactions!inner(organization_id, title)')
      .eq('transactions.organization_id', orgId)
      .not('status', 'in', '("completed","skipped")')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (filters?.status) {
      clQuery = clQuery.eq('status', filters.status);
    }
    if (filters?.assigneeId) {
      clQuery = clQuery.eq('assigned_to_user_id', filters.assigneeId);
    }

    const { data: clData, error: clErr } = await clQuery;
    if (clErr) throw clErr;

    for (const row of clData ?? []) {
      items.push({
        kind: 'checklist_item',
        id: row.id,
        title: row.title,
        status: row.status,
        assignee_id: row.assigned_to_user_id,
        transaction_id: row.transaction_id,
        due_date: row.due_date,
        created_at: row.created_at,
        raw: row as Record<string, unknown>,
      });
    }
  }

  // --- Approvals ---
  if (!wantType || wantType === 'approval') {
    let apQuery = supabase
      .from('approvals')
      .select('*, transactions(title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      apQuery = apQuery.eq('status', filters.status);
    } else {
      // Default to pending only when no explicit status filter
      apQuery = apQuery.eq('status', 'pending');
    }
    if (filters?.assigneeId) {
      apQuery = apQuery.eq('assigned_reviewer_id', filters.assigneeId);
    }

    const { data: apData, error: apErr } = await apQuery;
    if (apErr) throw apErr;

    for (const row of apData ?? []) {
      items.push({
        kind: 'approval',
        id: row.id,
        title: `${row.approval_type} approval`,
        status: row.status,
        assignee_id: row.assigned_reviewer_id,
        transaction_id: row.transaction_id,
        due_date: null,
        created_at: row.created_at,
        raw: row as Record<string, unknown>,
      });
    }
  }

  // --- Transactions (unassigned or filtered by assignee) ---
  if (!wantType || wantType === 'transaction') {
    let txQuery = supabase
      .from('transactions')
      .select('*, transaction_assignments(*)')
      .eq('organization_id', orgId)
      .not('status', 'in', '("closed","cancelled")');

    if (filters?.status) {
      txQuery = txQuery.eq('status', filters.status);
    }

    const { data: txData, error: txErr } = await txQuery;
    if (txErr) throw txErr;

    for (const row of txData ?? []) {
      const assignment = Array.isArray(row.transaction_assignments)
        ? row.transaction_assignments[0]
        : row.transaction_assignments;

      // When filtering by assignee, only include matching transactions
      if (filters?.assigneeId) {
        if (
          !assignment ||
          (assignment.primary_agent_id !== filters.assigneeId &&
            assignment.coordinator_owner_id !== filters.assigneeId &&
            assignment.broker_reviewer_id !== filters.assigneeId)
        ) {
          continue;
        }
      }

      items.push({
        kind: 'transaction',
        id: row.id,
        title: row.title,
        status: row.status,
        assignee_id: assignment?.primary_agent_id ?? null,
        transaction_id: row.id,
        due_date: null,
        created_at: row.created_at,
        raw: row as Record<string, unknown>,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// getQueueStats
// ---------------------------------------------------------------------------

/**
 * Returns summary counts for the org queue dashboard.
 */
export async function getQueueStats(orgId: string): Promise<QueueStats> {
  // Pending approvals
  const { count: pendingApprovals, error: paErr } = await supabase
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'pending');

  if (paErr) throw paErr;

  // Overdue checklist items
  const now = new Date().toISOString();
  const { count: overdueChecklistItems, error: odErr } = await supabase
    .from('checklist_items')
    .select('id, transactions!inner(organization_id)', {
      count: 'exact',
      head: true,
    })
    .eq('transactions.organization_id', orgId)
    .not('status', 'in', '("completed","skipped")')
    .lt('due_date', now);

  if (odErr) throw odErr;

  // Unassigned transactions — active transactions with no assignment record
  // or all role columns null
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('id, transaction_assignments(*)')
    .eq('organization_id', orgId)
    .not('status', 'in', '("closed","cancelled")');

  if (txErr) throw txErr;

  const unassignedTransactions = (txData ?? []).filter((tx: any) => {
    const a = Array.isArray(tx.transaction_assignments)
      ? tx.transaction_assignments[0]
      : tx.transaction_assignments;
    return (
      !a ||
      (!a.primary_agent_id && !a.coordinator_owner_id && !a.broker_reviewer_id)
    );
  }).length;

  // Documents currently processing
  const { count: documentsProcessing, error: dpErr } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('processing_status', 'processing');

  if (dpErr) throw dpErr;

  return {
    pendingApprovals: pendingApprovals ?? 0,
    overdueChecklistItems: overdueChecklistItems ?? 0,
    unassignedTransactions,
    documentsProcessing: documentsProcessing ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Queue views (saved filters)
// ---------------------------------------------------------------------------

/**
 * Persist a custom queue view for a user.
 */
export async function saveQueueView(
  userId: string,
  orgId: string,
  name: string,
  filters: Record<string, unknown>,
): Promise<QueueView> {
  const view = await queueViewRepo.create({
    user_id: userId,
    organization_id: orgId,
    name,
    queue_type: 'custom',
    filters,
    sort_order: null,
    is_default: false,
  });

  await logAction({
    organizationId: orgId,
    actorType: 'user',
    actorUserId: userId,
    action: 'queue_view.saved',
    targetType: 'queue_view',
    targetId: view.id,
    metadata: { name, filters },
  });

  return view;
}

/**
 * Return all saved queue views for a user within an org.
 */
export async function getQueueViews(
  userId: string,
  orgId: string,
): Promise<QueueView[]> {
  const { data, error } = await supabase
    .from('queue_views')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as QueueView[];
}
