import { supabase } from '@/lib/db/client';
import type { Notification, NotificationCategory } from '@/types';

const TABLE = 'notifications';

export async function findByUserId(
  userId: string,
  options?: {
    isRead?: boolean;
    category?: NotificationCategory;
    limit?: number;
    offset?: number;
  },
): Promise<Notification[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (options?.isRead !== undefined) {
    query = query.eq('is_read', options.isRead);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
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

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_archived', false);

  if (error) throw error;
  return count ?? 0;
}

export async function create(
  input: Omit<Notification, 'id' | 'created_at'>,
): Promise<Notification> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function archive(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function findByDedupKey(
  dedupKey: string,
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('dedup_key', dedupKey)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
