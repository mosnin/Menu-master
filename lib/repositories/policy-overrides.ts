import { supabase } from '@/lib/db/client';
import type { PolicyOverride } from '@/types';

const TABLE = 'policy_overrides';

export async function findByTransactionId(
  transactionId: string,
): Promise<PolicyOverride[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByRuleId(
  ruleId: string,
): Promise<PolicyOverride[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('policy_rule_id', ruleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findById(
  id: string,
): Promise<PolicyOverride | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<PolicyOverride, 'id' | 'created_at' | 'updated_at'>,
): Promise<PolicyOverride> {
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
  updates: Partial<Omit<PolicyOverride, 'id' | 'created_at' | 'updated_at'>>,
): Promise<PolicyOverride> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
