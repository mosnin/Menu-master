import { supabase } from '@/lib/db/client';
import type { DocumentExtraction } from '@/types';

const TABLE = 'document_extractions';

export async function findByDocumentId(
  documentId: string,
): Promise<DocumentExtraction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('document_id', documentId)
    .order('extraction_version', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findLatestByDocumentId(
  documentId: string,
): Promise<DocumentExtraction | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('document_id', documentId)
    .order('extraction_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<DocumentExtraction, 'id' | 'created_at'>,
): Promise<DocumentExtraction> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
