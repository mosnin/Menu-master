import { supabase } from '@/lib/db/client';
import type { RecentSearch } from '@/types';

const TABLE = 'recent_searches';

export async function findByUserId(
  userId: string,
  limit = 10,
): Promise<RecentSearch[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<RecentSearch, 'id' | 'created_at'>,
): Promise<RecentSearch> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function clearByUserId(userId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
