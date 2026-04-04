import { supabase } from '@/lib/db/client';
import type { TransactionAssignment } from '@/types';

const TABLE = 'transaction_assignments';

export async function findByTransactionId(
  transactionId: string,
): Promise<TransactionAssignment | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<TransactionAssignment, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionAssignment> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'transaction_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
