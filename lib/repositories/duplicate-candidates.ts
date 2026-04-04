import { supabase } from '@/lib/db/client';
import type { DuplicateCandidate } from '@/types';

const TABLE = 'duplicate_candidates';

export async function findByOrgId(
  orgId: string,
  options?: { entityType?: string; resolution?: string; limit?: number },
): Promise<DuplicateCandidate[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('similarity_score', { ascending: false });
  if (options?.entityType) query = query.eq('entity_type', options.entityType);
  if (options?.resolution) query = query.eq('resolution', options.resolution);
  if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DuplicateCandidate, 'id' | 'created_at'>,
): Promise<DuplicateCandidate> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function resolve(
  id: string,
  resolution: string,
  userId: string,
): Promise<DuplicateCandidate> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      resolution,
      resolved_by_user_id: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function countPending(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('resolution', 'pending');
  if (error) throw error;
  return count ?? 0;
}
