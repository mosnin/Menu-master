import { supabase } from '@/lib/db/client';
import type { ClosingReadiness } from '@/types';

const TABLE = 'closing_readiness';

export async function findByTransactionId(
  transactionId: string,
): Promise<ClosingReadiness | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<ClosingReadiness, 'id' | 'created_at' | 'updated_at'>,
): Promise<ClosingReadiness> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'transaction_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
