'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { CreateTransactionSchema, UpdateTransactionSchema } from '@/lib/validation/schemas';
import * as transactionService from '@/lib/services/transaction-service';

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
  }

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${id}`);

  return transaction;
}

export async function getTransactionsAction(orgId: string) {
  await requireOrgMembership(orgId);

  const transactions = await transactionService.getTransactionsByOrg(orgId);

  return transactions;
}
