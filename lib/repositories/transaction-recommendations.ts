import { supabase } from '@/lib/db/client';
import type { TransactionRecommendation, RecommendationStatus } from '@/types';

const TABLE = 'transaction_recommendations';

export async function findByTransactionId(
  transactionId: string,
): Promise<TransactionRecommendation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findPendingByTransactionId(
  transactionId: string,
): Promise<TransactionRecommendation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TransactionRecommendation, 'id' | 'created_at' | 'updated_at'>,
): Promise<TransactionRecommendation> {
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
  status: RecommendationStatus,
): Promise<TransactionRecommendation> {
  const updates: Record<string, unknown> = { status };
  if (status === 'executed') {
    updates.executed_at = new Date().toISOString();
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
