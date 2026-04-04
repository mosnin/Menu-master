import { supabase } from '@/lib/db/client';
import type { ChecklistItem } from '@/types';

const TABLE = 'checklist_items';

export async function findByTransactionId(
  transactionId: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<ChecklistItem | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createMany(
  items: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[],
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(items)
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  input: Partial<Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findUpcoming(
  orgId: string,
  days: number,
): Promise<ChecklistItem[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, transactions!inner(organization_id)')
    .eq('transactions.organization_id', orgId)
    .neq('status', 'completed')
    .neq('status', 'skipped')
    .gte('due_date', now.toISOString())
    .lte('due_date', future.toISOString())
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findNeedsReview(
  transactionId: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('requires_review', true)
    .eq('status', 'needs_review')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
