import { supabase } from '@/lib/db/client';
import type { DailyDigestPreference } from '@/types';

const TABLE = 'daily_digest_preferences';

export async function findByUserId(
  userId: string,
): Promise<DailyDigestPreference | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<DailyDigestPreference, 'id' | 'created_at' | 'updated_at'>,
): Promise<DailyDigestPreference> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
