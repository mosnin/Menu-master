import { supabase } from '@/lib/db/client';
import type { DocumentRequestUpload } from '@/types';

const TABLE = 'document_request_uploads';

export async function findByRequestId(
  requestId: string,
): Promise<DocumentRequestUpload[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('document_request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DocumentRequestUpload, 'id' | 'created_at'>,
): Promise<DocumentRequestUpload> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
