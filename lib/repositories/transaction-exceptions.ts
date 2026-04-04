import { supabase } from '@/lib/db/client';
import type { TransactionException, ExceptionResolutionStatus } from '@/types';

const TABLE = 'transaction_exceptions';

export async function findByTransactionId(
  transactionId: string,
): Promise<TransactionException[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findOpenByTransactionId(
  transactionId: string,
): Promise<TransactionException[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('resolution_status', 'open')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TransactionException, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionException> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateResolution(
  id: string,
  resolutionStatus: ExceptionResolutionStatus,
  resolvedByUserId?: string,
): Promise<TransactionException> {
  const updates: Record<string, unknown> = {
    resolution_status: resolutionStatus,
  };
  if (resolvedByUserId) {
    updates.resolved_by_user_id = resolvedByUserId;
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
