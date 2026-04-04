import { supabase } from '@/lib/db/client';
import type { NotificationPreference } from '@/types';

const TABLE = 'notification_preferences';

export async function findByUserAndOrg(
  userId: string,
  orgId: string,
): Promise<NotificationPreference | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsert(
  input: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>,
): Promise<NotificationPreference> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'user_id,organization_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
