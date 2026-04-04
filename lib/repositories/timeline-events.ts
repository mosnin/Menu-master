import { supabase } from '@/lib/db/client';
import type { TimelineEvent } from '@/types';

const TABLE = 'timeline_events';

export async function findByTransactionId(
  transactionId: string,
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>,
): Promise<TimelineEvent> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createMany(
  events: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>[],
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(events)
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  input: Partial<Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>>,
): Promise<TimelineEvent> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
