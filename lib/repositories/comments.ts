import { supabase } from '@/lib/db/client';
import type { Comment, CommentEntityType } from '@/types';

const TABLE = 'comments';

export async function findByTransactionId(
  transactionId: string,
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByEntity(
  entityType: CommentEntityType,
  entityId: string,
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Comment, 'id' | 'created_at' | 'updated_at'>,
): Promise<Comment> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateResolution(
  id: string,
  isResolved: boolean,
  resolvedByUserId?: string,
): Promise<Comment> {
  const updates: Record<string, unknown> = { is_resolved: isResolved };
  if (isResolved && resolvedByUserId) {
    updates.resolved_by_user_id = resolvedByUserId;
    updates.resolved_at = new Date().toISOString();
  } else if (!isResolved) {
    updates.resolved_by_user_id = null;
    updates.resolved_at = null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
