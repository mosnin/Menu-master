import { supabase } from '@/lib/db/client';
import * as assignmentRepo from '@/lib/repositories/transaction-assignments';
import * as checklistItemRepo from '@/lib/repositories/checklist-items';
import * as approvalRepo from '@/lib/repositories/approvals';
import { logAction } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';
import type {
  TransactionAssignment,
  ChecklistItem,
  Approval,
  UserRole,
} from '@/types';

// ---------------------------------------------------------------------------
// Transaction assignment
// ---------------------------------------------------------------------------

type AssignmentRole = 'primary_agent' | 'coordinator_owner' | 'broker_reviewer';

/**
 * Assign a user to a transaction under a specific role.
 * Creates the transaction_assignment row if it doesn't exist yet, then sets
 * the appropriate role column.
 */
export async function assignTransaction(
  transactionId: string,
  userId: string,
  role: AssignmentRole,
  assignedByUserId: string,
): Promise<TransactionAssignment> {
  // Look up (or bootstrap) the existing assignment record
  let existing = await assignmentRepo.findByTransactionId(transactionId);

  const roleColumn = roleToColumn(role);

  const payload: Record<string, string | null> = {
    transaction_id: transactionId,
    primary_agent_id: existing?.primary_agent_id ?? null,
    coordinator_owner_id: existing?.coordinator_owner_id ?? null,
    broker_reviewer_id: existing?.broker_reviewer_id ?? null,
  };
  payload[roleColumn] = userId;

  const assignment = await assignmentRepo.upsert(
    payload as Omit<TransactionAssignment, 'id' | 'created_at' | 'updated_at'>,
  );

  // Resolve the transaction's org id for audit logging
  const orgId = await resolveTransactionOrgId(transactionId);

  await logAction({
    organizationId: orgId,
    transactionId,
    actorType: 'user',
    actorUserId: assignedByUserId,
    action: 'assignment.created',
    targetType: 'transaction_assignment',
    targetId: assignment.id,
    metadata: { role, assigned_user_id: userId },
  });

  return assignment;
}

/**
 * Remove a user from a transaction assignment by clearing their role column.
 * If all role columns end up null the row is preserved (soft-clear).
 */
export async function unassignTransaction(
  assignmentId: string,
  role: AssignmentRole,
  unassignedByUserId: string,
): Promise<TransactionAssignment> {
  const roleColumn = roleToColumn(role);

  const { data, error } = await supabase
    .from('transaction_assignments')
    .update({ [roleColumn]: null })
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to unassign transaction: ${error.message}`);
  const assignment = data as TransactionAssignment;

  const orgId = await resolveTransactionOrgId(assignment.transaction_id);

  await logAction({
    organizationId: orgId,
    transactionId: assignment.transaction_id,
    actorType: 'user',
    actorUserId: unassignedByUserId,
    action: 'assignment.removed',
    targetType: 'transaction_assignment',
    targetId: assignmentId,
    metadata: { role },
  });

  return assignment;
}

/**
 * Return the assignment record for a transaction, joined with user profiles.
 */
export async function getAssignmentsForTransaction(
  transactionId: string,
): Promise<TransactionAssignment | null> {
  const { data, error } = await supabase
    .from('transaction_assignments')
    .select(
      `*,
       primary_agent:user_profiles!transaction_assignments_primary_agent_id_fkey(*),
       coordinator:user_profiles!transaction_assignments_coordinator_owner_id_fkey(*),
       broker_reviewer:user_profiles!transaction_assignments_broker_reviewer_id_fkey(*)`,
    )
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);
  return data as TransactionAssignment | null;
}

/**
 * Return all transactions assigned to a user across any role.
 */
export async function getTransactionsForUser(
  userId: string,
): Promise<TransactionAssignment[]> {
  const { data, error } = await supabase
    .from('transaction_assignments')
    .select('*, transactions(*)')
    .or(
      `primary_agent_id.eq.${userId},coordinator_owner_id.eq.${userId},broker_reviewer_id.eq.${userId}`,
    )
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user assignments: ${error.message}`);
  return (data ?? []) as TransactionAssignment[];
}

// ---------------------------------------------------------------------------
// Checklist-item assignment
// ---------------------------------------------------------------------------

export async function assignChecklistItem(
  itemId: string,
  userId: string,
  assignedByUserId: string,
): Promise<ChecklistItem> {
  const item = await checklistItemRepo.update(itemId, {
    assigned_to_user_id: userId,
  });

  // Resolve org id via the item's transaction
  const orgId = await resolveTransactionOrgId(item.transaction_id);

  await logAction({
    organizationId: orgId,
    transactionId: item.transaction_id,
    actorType: 'user',
    actorUserId: assignedByUserId,
    action: 'assignment.created',
    targetType: 'checklist_item',
    targetId: itemId,
    metadata: { assigned_user_id: userId },
  });

  return item;
}

// ---------------------------------------------------------------------------
// Approval reviewer assignment
// ---------------------------------------------------------------------------

export async function assignApprovalReviewer(
  approvalId: string,
  reviewerId: string,
  assignedByUserId: string,
): Promise<Approval> {
  const approval = await approvalRepo.update(approvalId, {
    assigned_reviewer_id: reviewerId,
  });

  await logAction({
    organizationId: approval.organization_id,
    transactionId: approval.transaction_id,
    actorType: 'user',
    actorUserId: assignedByUserId,
    action: 'assignment.created',
    targetType: 'approval',
    targetId: approvalId,
    metadata: { assigned_reviewer_id: reviewerId },
  });

  return approval;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleToColumn(role: AssignmentRole): string {
  const map: Record<AssignmentRole, string> = {
    primary_agent: 'primary_agent_id',
    coordinator_owner: 'coordinator_owner_id',
    broker_reviewer: 'broker_reviewer_id',
  };
  return map[role];
}

async function resolveTransactionOrgId(
  transactionId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to resolve org id for transaction', {
      error,
      transactionId,
    });
    return undefined;
  }
  return data?.organization_id ?? undefined;
}
