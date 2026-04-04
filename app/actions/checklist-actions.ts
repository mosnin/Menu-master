'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { updateChecklistItem, getChecklistSummary } from '@/lib/services/checklist-service';
import * as checklistItemRepo from '@/lib/repositories/checklist-items';
import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import type { ChecklistItemStatus } from '@/types';

export async function updateChecklistItemAction(
  itemId: string,
  updates: {
    status?: ChecklistItemStatus;
    due_date?: string;
    title?: string;
    description?: string;
  },
) {
  const session = await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Verify org membership via the checklist item's transaction
  const existing = await checklistItemRepo.findById(itemId);
  if (!existing) throw new Error('Checklist item not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', existing.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const item = await updateChecklistItem(itemId, updates, profile.id);

  revalidatePath(`/transactions/${item.transaction_id}`);
  revalidatePath(`/transactions/${item.transaction_id}/checklist`);

  return item;
}

export async function addChecklistItemAction(data: {
  transactionId: string;
  title: string;
  description?: string;
  dueDate?: string;
  source?: 'manual' | 'ai_generated' | 'template';
  requiresReview?: boolean;
}) {
  const session = await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Verify org membership via the transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', data.transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const item = await checklistItemRepo.create({
    transaction_id: data.transactionId,
    title: data.title,
    description: data.description ?? null,
    due_date: data.dueDate ?? null,
    status: 'pending',
    source: data.source ?? 'manual',
    requires_review: data.requiresReview ?? false,
    completed_at: null,
    assigned_to_user_id: null,
  });

  await logAction({
    organizationId: transaction.organization_id,
    transactionId: data.transactionId,
    actorType: 'user',
    actorUserId: profile.id,
    action: 'checklist_item.created',
    targetType: 'checklist_item',
    targetId: item.id,
    metadata: { title: data.title, source: data.source ?? 'manual' },
  });

  revalidatePath(`/transactions/${data.transactionId}`);
  revalidatePath(`/transactions/${data.transactionId}/checklist`);

  return item;
}
