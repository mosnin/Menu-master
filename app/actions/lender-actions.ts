'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as lenderService from '@/lib/services/lender-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function submitLenderUpdateAction(
  transactionId: string,
  milestone: string,
  status: string,
  notes?: string,
  evidenceDocumentId?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    await lenderService.submitLenderUpdate({
      transactionId,
      milestone,
      status,
      notes,
      evidenceDocumentId,
      submittedByUserId: profile.id,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/lender`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to submit lender update' };
  }
}

export async function getLenderProgressAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const progress = await lenderService.getLenderProgress(transactionId);
    return { data: progress };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get lender progress' };
  }
}

export async function getLenderUpdatesAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const updates = await lenderService.getLenderUpdates(transactionId);
    return { data: updates };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get lender updates' };
  }
}
