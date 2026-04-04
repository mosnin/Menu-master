'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as closingService from '@/lib/services/closing-readiness-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function computeClosingReadinessAction(
  transactionId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const readiness = await closingService.computeClosingReadiness(transactionId);

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/closing`);

    return { success: true, data: readiness };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compute closing readiness' };
  }
}

export async function getClosingReadinessAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const readiness = await closingService.getClosingReadiness(transactionId);
    return { data: readiness };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get closing readiness' };
  }
}
