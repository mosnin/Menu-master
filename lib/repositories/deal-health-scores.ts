import { supabase } from '@/lib/db/client';
import type { DealHealthScore } from '@/types';

const TABLE = 'deal_health_scores';

export async function findByTransactionId(
  transactionId: string,
): Promise<DealHealthScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findLatestByTransaction(
  transactionId: string,
): Promise<DealHealthScore | null> {
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

export async function findByOrgId(
  orgId: string,
): Promise<DealHealthScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DealHealthScore, 'id' | 'created_at'>,
): Promise<DealHealthScore> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
