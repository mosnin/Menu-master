import { supabase } from '@/lib/db/client';
import type { TransactionCompleteness } from '@/types';

const TABLE = 'transaction_completeness';

export async function findByTransactionId(
  transactionId: string,
): Promise<TransactionCompleteness | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<TransactionCompleteness, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionCompleteness> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'transaction_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
