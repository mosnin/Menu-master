import { supabase } from '@/lib/db/client';
import type { ResponseObligation, ObligationStatus } from '@/types';

const TABLE = 'response_obligations';

export async function findByTransactionId(
  transactionId: string,
): Promise<ResponseObligation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findOpenByTransaction(
  transactionId: string,
): Promise<ResponseObligation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .in('status', ['waiting', 'overdue', 'escalated'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ResponseObligation, 'id' | 'created_at' | 'updated_at'>,
): Promise<ResponseObligation> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateStatus(
  id: string,
  status: ObligationStatus,
): Promise<ResponseObligation> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
