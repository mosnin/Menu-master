'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as healthScoreService from '@/lib/services/health-score-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function computeHealthScoreAction(
  transactionId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const score = await healthScoreService.computeHealthScore(transactionId, profile.id);

    revalidatePath(`/transactions/${transactionId}`);

    return { success: true, data: score };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compute health score' };
  }
}

export async function getHealthScoreAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const score = await healthScoreService.getHealthScore(transactionId);
    return { data: score };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get health score' };
  }
}

export async function getHealthScoreHistoryAction(
  transactionId: string,
  limit?: number,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const history = await healthScoreService.getHealthScoreHistory(transactionId, limit);
    return { data: history };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get health score history' };
  }
}
