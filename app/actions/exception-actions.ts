'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { resolveException, getActiveExceptions } from '@/lib/services/exception-service';
import { supabase } from '@/lib/db/client';

export async function resolveExceptionAction(
  exceptionId: string,
  resolution: string,
) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the exception to find its transaction and org
  const { data: exception } = await supabase
    .from('exceptions')
    .select('transaction_id')
    .eq('id', exceptionId)
    .single();
  if (!exception) throw new Error('Exception not found');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', exception.transaction_id)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const result = await resolveException(exceptionId, resolution, profile.id);

  revalidatePath(`/transactions/${exception.transaction_id}`);

  return result;
}

export async function getExceptionsAction(transactionId: string) {
  await requireAuth();

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();
  if (!transaction) throw new Error('Transaction not found');

  await requireOrgMembership(transaction.organization_id);

  const exceptions = await getActiveExceptions(transactionId);

  return exceptions;
}
