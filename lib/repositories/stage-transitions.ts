import { supabase } from '@/lib/db/client';
import type { StageTransition } from '@/types';

const TABLE = 'stage_transitions';

export async function findByTransactionId(
  transactionId: string,
  limit = 50,
): Promise<StageTransition[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
  limit = 50,
): Promise<StageTransition[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<StageTransition, 'id' | 'created_at'>,
): Promise<StageTransition> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findLatestByTransactionId(
  transactionId: string,
): Promise<StageTransition | null> {
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
