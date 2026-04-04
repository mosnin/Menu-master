'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { resolveException, getActiveExceptions } from '@/lib/services/exception-service';
import { supabase } from '@/lib/db/client';
import { ResolveExceptionSchema, UuidSchema } from '@/lib/validation/schemas';
import { trackEvent } from '@/lib/analytics/events';

export async function resolveExceptionAction(
  exceptionId: string,
  resolution: string,
) {
  const validated = ResolveExceptionSchema.parse({ exceptionId, resolution });
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

  const result = await resolveException(validated.exceptionId, profile.id, validated.resolution);

  revalidatePath(`/transactions/${exception.transaction_id}`);

  trackEvent({ orgId: transaction.organization_id, userId: profile.id, event: 'exception_resolved' as any, category: 'exception', properties: { exceptionId, transactionId: exception.transaction_id } });

  return result;
}

export async function getExceptionsAction(transactionId: string) {
  UuidSchema.parse(transactionId);
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
