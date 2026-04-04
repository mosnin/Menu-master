'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as economicsService from '@/lib/services/economics-service';
import { supabase } from '@/lib/db/client';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function createOrUpdateEconomicsAction(
  transactionId: string,
  data: Record<string, unknown>,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const economics = await economicsService.createOrUpdateEconomics(transactionId, data, profile.id);

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/economics`);

    return { success: true, data: economics };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to save economics' };
  }
}

export async function finalizeEconomicsAction(
  transactionId: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['broker_admin']);

    const economics = await economicsService.finalizeEconomics(transactionId, profile.id);

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/economics`);
    revalidatePath('/broker');
    revalidatePath('/broker/forecast');

    return { success: true, data: economics };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to finalize economics' };
  }
}

export async function getEconomicsAction(
  transactionId: string,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['agent', 'coordinator', 'broker_admin']);

    const economics = await economicsService.getEconomics(transactionId);
    return { data: economics };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get economics' };
  }
}

export async function createSplitAction(
  economicsId: string,
  data: Record<string, unknown>,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const split = await economicsService.createSplit(economicsId, data, profile.id);

    // Look up the economics record to revalidate the specific transaction
    const { data: economics } = await supabase
      .from('transaction_economics')
      .select('transaction_id')
      .eq('id', economicsId)
      .single();

    if (economics?.transaction_id) {
      revalidatePath(`/transactions/${economics.transaction_id}`);
      revalidatePath(`/transactions/${economics.transaction_id}/economics`);
    }
    revalidatePath('/transactions');

    return { success: true, data: split };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create split' };
  }
}

export async function getSplitsAction(
  economicsId: string,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const splits = await economicsService.getSplits(economicsId);
    return { data: splits };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get splits' };
  }
}
