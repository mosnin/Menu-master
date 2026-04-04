'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as stageService from '@/lib/services/stage-service';
import * as transactionRepo from '@/lib/repositories/transactions';
import type { TransactionStage } from '@/types';

export async function transitionStageAction(
  transactionId: string,
  toStage: TransactionStage,
  reason?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const transaction = await transactionRepo.findById(transactionId);
    if (!transaction) return { error: 'Transaction not found' };

    await requireRole(transaction.organization_id, ['coordinator', 'broker_admin']);

    await stageService.transitionStage(transactionId, toStage, profile.id, { reason });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath('/transactions');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to transition stage' };
  }
}

export async function getAvailableStagesAction(
  transactionId: string,
): Promise<{ data?: TransactionStage[]; error?: string }> {
  try {
    await requireAuth();
    const transaction = await transactionRepo.findById(transactionId);
    if (!transaction) return { error: 'Transaction not found' };

    const currentStage = (transaction.stage ?? 'intake') as TransactionStage;
    const available = stageService.getAvailableStageTransitions(currentStage);

    return { data: available };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get available stages' };
  }
}

export async function getStageHistoryAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const history = await stageService.getTransitionHistory(transactionId);
    return { data: history };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get stage history' };
  }
}
