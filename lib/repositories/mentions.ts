import { supabase } from '@/lib/db/client';
import type { Mention } from '@/types';

const TABLE = 'mentions';

export async function findByUserId(
  userId: string,
): Promise<Mention[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findUnreadByUserId(
  userId: string,
): Promise<Mention[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('mentioned_user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Mention, 'id' | 'created_at'>,
): Promise<Mention> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function markAsRead(
  id: string,
): Promise<Mention> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
