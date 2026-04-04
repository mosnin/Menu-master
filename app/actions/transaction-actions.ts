'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { CreateTransactionSchema, UpdateTransactionSchema } from '@/lib/validation/schemas';
import * as transactionService from '@/lib/services/transaction-service';
import { logAction } from '@/lib/audit/logger';
import { trackEvent } from '@/lib/analytics/events';
import { recordMilestone } from '@/lib/analytics/milestones';

export async function createTransactionAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const raw = {
      title: formData.get('title'),
      organizationId: formData.get('organizationId') || profile.memberships?.[0]?.organization_id,
      propertyAddress: formData.get('addressLine1')
        ? {
            addressLine1: formData.get('addressLine1'),
            addressLine2: formData.get('addressLine2') || undefined,
            city: formData.get('city'),
            state: formData.get('state'),
            postalCode: formData.get('postalCode'),
          }
        : undefined,
      buyerName: formData.get('buyerName') || undefined,
      buyerEmail: formData.get('buyerEmail') || undefined,
      sellerName: formData.get('sellerName') || undefined,
      sellerEmail: formData.get('sellerEmail') || undefined,
    };

    const parsed = CreateTransactionSchema.parse(raw);
    await requireOrgMembership(parsed.organizationId);

    const transaction = await transactionService.createTransaction(parsed, profile.id);

    revalidatePath('/transactions');
    trackEvent({ orgId: parsed.organizationId, userId: profile.id, event: 'transaction_created' as any, category: 'transaction', properties: { transactionId: transaction.id } });
    recordMilestone(parsed.organizationId, profile.id, 'first_transaction');
    return { id: transaction.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create transaction' };
  }
}

export async function updateTransactionAction(id: string, data: Record<string, unknown>) {
  const session = await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const parsed = UpdateTransactionSchema.parse(data);

  // Get the transaction to check org membership
  const existing = await transactionService.getTransactionWithDetails(id);
  if (!existing) throw new Error('Transaction not found');

  await requireOrgMembership(existing.organization_id);

  let transaction;
  if (parsed.status) {
    transaction = await transactionService.updateTransactionStatus(id, parsed.status, profile.id);
  } else {
    // For non-status updates, use the repository directly
    const { update } = await import('@/lib/repositories/transactions');
    transaction = await update(id, parsed);

    // Audit log for non-status updates
    await logAction({
      organizationId: existing.organization_id,
      transactionId: id,
      actorType: 'user',
      actorUserId: profile.id,
      action: 'transaction.updated',
      targetType: 'transaction',
      targetId: id,
      metadata: parsed,
    });
  }

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${id}`);

  if (parsed.status) {
    trackEvent({ orgId: existing.organization_id, userId: profile.id, event: 'transaction_status_changed' as any, category: 'transaction', properties: { transactionId: id, status: parsed.status } });
    if (parsed.status === 'active') {
      recordMilestone(existing.organization_id, profile.id, 'first_live_transaction');
    }
  }

  return transaction;
}

export async function getTransactionsAction(orgId: string) {
  await requireAuth();
  await requireOrgMembership(orgId);

  const transactions = await transactionService.getTransactionsByOrg(orgId);

  return transactions;
}
