import { supabase } from '@/lib/db/client';
import type { TransactionEconomics } from '@/types';

const TABLE = 'transaction_economics';

export async function findByTransactionId(
  transactionId: string,
): Promise<TransactionEconomics | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(orgId: string): Promise<TransactionEconomics[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TransactionEconomics, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionEconomics> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  input: Partial<Omit<TransactionEconomics, 'id' | 'created_at' | 'updated_at'>>,
): Promise<TransactionEconomics> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<TransactionEconomics, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionEconomics> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'transaction_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
