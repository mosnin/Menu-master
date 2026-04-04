'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { recalculateCompleteness, getCompleteness } from '@/lib/services/completeness-service';
import { supabase } from '@/lib/db/client';

export async function recalculateCompletenessAction(transactionId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await recalculateCompleteness(transactionId);

  revalidatePath(`/transactions/${transactionId}`);

  return result;
}

export async function getCompletenessAction(transactionId: string) {
  await requireAuth();

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const completeness = await getCompleteness(transactionId);

  return completeness;
}
