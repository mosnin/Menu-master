import { supabase } from '@/lib/db/client';
import type { Transaction, TransactionStatus } from '@/types';

const TABLE = 'transactions';

export async function findById(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
  options?: { status?: TransactionStatus; limit?: number; offset?: number },
): Promise<Transaction[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findByOrgIdWithDetails(orgId: string): Promise<
  (Transaction & {
    properties: Record<string, unknown> | null;
    user_profiles: Record<string, unknown> | null;
  })[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, properties(*), user_profiles:created_by_user_id(*)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
): Promise<Transaction> {
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
  input: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function countByOrgId(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) throw error;
  return count ?? 0;
}

export async function findNeedingAttention(
  orgId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
