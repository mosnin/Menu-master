'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import {
  assignTransaction,
  unassignTransaction,
  assignChecklistItem,
  assignApprovalReviewer,
} from '@/lib/services/assignment-service';
import { supabase } from '@/lib/db/client';

export async function assignTransactionAction(
  transactionId: string,
  userId: string,
  role: string,
) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const assignment = await assignTransaction(transactionId, userId, role as 'primary_agent' | 'coordinator_owner' | 'broker_reviewer', profile.id);

  revalidatePath(`/transactions/${transactionId}`);

  return assignment;
}

export async function unassignTransactionAction(assignmentId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the assignment to find its transaction and org
  const { data: assignment } = await supabase
    .from('transaction_assignments')
    .select('transaction_id')
    .eq('id', assignmentId)
    .single();
  if (!assignment) throw new Error('Assignment not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', assignment.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await unassignTransaction(assignmentId, 'primary_agent', profile.id);

  revalidatePath(`/transactions/${assignment.transaction_id}`);

  return result;
}

export async function assignChecklistItemAction(itemId: string, userId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the checklist item to find its transaction and org
  const { data: item } = await supabase
    .from('checklist_items')
    .select('transaction_id')
    .eq('id', itemId)
    .single();
  if (!item) throw new Error('Checklist item not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', item.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await assignChecklistItem(itemId, userId, profile.id);

  revalidatePath(`/transactions/${item.transaction_id}`);
  revalidatePath(`/transactions/${item.transaction_id}/checklist`);

  return result;
}

export async function assignApprovalReviewerAction(approvalId: string, reviewerId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the approval to find its transaction and org
  const { data: approval } = await supabase
    .from('approvals')
    .select('transaction_id, organization_id')
    .eq('id', approvalId)
    .single();
  if (!approval) throw new Error('Approval not found');

  await requireOrgMembership(approval.organization_id);

  const result = await assignApprovalReviewer(approvalId, reviewerId, profile.id);

  revalidatePath(`/transactions/${approval.transaction_id}`);
  revalidatePath('/approvals');

  return result;
}
