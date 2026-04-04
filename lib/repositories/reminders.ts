import { supabase } from '@/lib/db/client';
import type { Reminder } from '@/types';

const TABLE = 'reminders';

export async function findByTransactionId(
  transactionId: string,
): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findDue(): Promise<Reminder[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findUpcomingByOrgId(
  orgId: string,
  days: number,
): Promise<Reminder[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .gte('scheduled_for', now.toISOString())
    .lte('scheduled_for', future.toISOString())
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>,
): Promise<Reminder> {
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
  input: Partial<Omit<Reminder, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
