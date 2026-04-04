import { supabase } from '@/lib/db/client';
import type { RecomputeJob, RecomputeJobStatus } from '@/types';

const TABLE = 'recompute_jobs';

export async function findById(id: string): Promise<RecomputeJob | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
  options?: { status?: RecomputeJobStatus; limit?: number },
): Promise<RecomputeJob[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (options?.status) query = query.eq('status', options.status);
  if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<RecomputeJob, 'id' | 'created_at'>,
): Promise<RecomputeJob> {
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
  input: Partial<Omit<RecomputeJob, 'id' | 'created_at'>>,
): Promise<RecomputeJob> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
