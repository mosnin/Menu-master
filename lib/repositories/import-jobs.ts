import { supabase } from '@/lib/db/client';
import type { ImportJob, ImportJobStatus } from '@/types';

const TABLE = 'import_jobs';

export async function findById(id: string): Promise<ImportJob | null> {
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
  options?: { status?: ImportJobStatus; limit?: number },
): Promise<ImportJob[]> {
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
  input: Omit<ImportJob, 'id' | 'created_at' | 'updated_at'>,
): Promise<ImportJob> {
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
  input: Partial<Omit<ImportJob, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ImportJob> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
