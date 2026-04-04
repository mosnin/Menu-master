'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
import { updateChecklistItem, getChecklistSummary } from '@/lib/services/checklist-service';
import * as checklistItemRepo from '@/lib/repositories/checklist-items';
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

  const item = await checklistItemRepo.create({
    transaction_id: data.transactionId,
    title: data.title,
    description: data.description ?? null,
    due_date: data.dueDate ?? null,
    status: 'pending',
    source: data.source ?? 'manual',
    requires_review: data.requiresReview ?? false,
    completed_at: null,
  });

  revalidatePath(`/transactions/${data.transactionId}`);
  revalidatePath(`/transactions/${data.transactionId}/checklist`);

  return item;
}
