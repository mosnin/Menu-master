import { supabase } from '@/lib/db/client';
import type { DailyDigest } from '@/types';

const TABLE = 'daily_digests';

export async function findByUserAndDate(
  userId: string,
  digestDate: string,
): Promise<DailyDigest | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('digest_date', digestDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<DailyDigest, 'id' | 'created_at'>,
): Promise<DailyDigest> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateSentStatus(
  id: string,
  sent: boolean,
): Promise<DailyDigest> {
  const updateData: Record<string, unknown> = { email_sent: sent };
  if (sent) {
    updateData.sent_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
