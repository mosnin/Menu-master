import { supabase } from '@/lib/db/client';
import type { TransactionParty } from '@/types';

const TABLE = 'transaction_parties';

export async function findByTransactionId(
  transactionId: string,
): Promise<(TransactionParty & { contacts: Record<string, unknown> })[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, contacts(*)')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TransactionParty, 'id' | 'created_at'>,
): Promise<TransactionParty> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
