'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as responsivenessService from '@/lib/services/responsiveness-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function createObligationAction(
  transactionId: string,
  partyType: string,
  partyName: string,
  obligationType: string,
  description: string,
  expectedBy?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    await responsivenessService.createObligation({
      transactionId,
      partyType,
      partyName,
      obligationType,
      description,
      expectedBy,
      createdByUserId: profile.id,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/responsiveness`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create obligation' };
  }
}

export async function markRespondedAction(
  obligationId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const obligation = await responsivenessService.getObligation(obligationId);
    if (!obligation) return { error: 'Obligation not found' };

    const orgId = await getTransactionOrgId(obligation.transaction_id);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    await responsivenessService.markResponded(obligationId, profile.id);

    revalidatePath(`/transactions/${obligation.transaction_id}`);
    revalidatePath(`/transactions/${obligation.transaction_id}/responsiveness`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to mark obligation as responded' };
  }
}

export async function markEscalatedAction(
  obligationId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const obligation = await responsivenessService.getObligation(obligationId);
    if (!obligation) return { error: 'Obligation not found' };

    const orgId = await getTransactionOrgId(obligation.transaction_id);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    await responsivenessService.markEscalated(obligationId, profile.id);

    revalidatePath(`/transactions/${obligation.transaction_id}`);
    revalidatePath(`/transactions/${obligation.transaction_id}/responsiveness`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to escalate obligation' };
  }
}

export async function getResponsivenessReportAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const report = await responsivenessService.getResponsivenessReport(transactionId);
    return { data: report };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get responsiveness report' };
  }
}
