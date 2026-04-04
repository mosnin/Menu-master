import { supabase } from '@/lib/db/client';
import type { ImportRow, ImportRowStatus } from '@/types';

const TABLE = 'import_rows';

export async function findByJobId(
  jobId: string,
  options?: { status?: ImportRowStatus; limit?: number; offset?: number },
): Promise<ImportRow[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('import_job_id', jobId)
    .order('row_number', { ascending: true });
  if (options?.status) query = query.eq('status', options.status);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createMany(
  rows: Omit<ImportRow, 'id' | 'created_at'>[],
): Promise<ImportRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  input: Partial<Omit<ImportRow, 'id' | 'created_at'>>,
): Promise<ImportRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function countByJobAndStatus(
  jobId: string,
): Promise<Record<ImportRowStatus, number>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('status')
    .eq('import_job_id', jobId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts as Record<ImportRowStatus, number>;
}
