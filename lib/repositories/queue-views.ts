import { supabase } from '@/lib/db/client';
import type { QueueView } from '@/types';

const TABLE = 'queue_views';

export async function findByUserId(
  userId: string,
): Promise<QueueView[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<QueueView, 'id' | 'created_at' | 'updated_at'>,
): Promise<QueueView> {
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
  input: Partial<Omit<QueueView, 'id' | 'created_at' | 'updated_at'>>,
): Promise<QueueView> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteById(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
