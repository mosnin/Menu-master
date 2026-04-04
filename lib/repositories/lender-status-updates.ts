import { supabase } from '@/lib/db/client';
import type { LenderStatusUpdate } from '@/types';

const TABLE = 'lender_status_updates';

export async function findByTransactionId(
  transactionId: string,
): Promise<LenderStatusUpdate[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<LenderStatusUpdate, 'id' | 'created_at'>,
): Promise<LenderStatusUpdate> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findLatestByTransaction(
  transactionId: string,
): Promise<LenderStatusUpdate | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
