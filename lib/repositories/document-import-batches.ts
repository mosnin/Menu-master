import { supabase } from '@/lib/db/client';
import type { DocumentImportBatch } from '@/types';

const TABLE = 'document_import_batches';

export async function findById(id: string): Promise<DocumentImportBatch | null> {
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
  limit = 20,
): Promise<DocumentImportBatch[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DocumentImportBatch, 'id' | 'created_at' | 'updated_at'>,
): Promise<DocumentImportBatch> {
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
  input: Partial<Omit<DocumentImportBatch, 'id' | 'created_at' | 'updated_at'>>,
): Promise<DocumentImportBatch> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
