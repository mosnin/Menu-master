import { supabase } from '@/lib/db/client';
import type { ExtractedFieldValue } from '@/types';

const TABLE = 'extracted_field_values';

export async function findByDocumentId(
  documentId: string,
): Promise<ExtractedFieldValue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByExtractionId(
  extractionId: string,
): Promise<ExtractedFieldValue[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('extraction_id', extractionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ExtractedFieldValue, 'id' | 'created_at'>,
): Promise<ExtractedFieldValue> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCorrection(
  id: string,
  correctedValue: string,
  correctedByUserId: string,
): Promise<ExtractedFieldValue> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      corrected_value: correctedValue,
      corrected_by_user_id: correctedByUserId,
      corrected_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateLock(
  id: string,
  isLocked: boolean,
): Promise<ExtractedFieldValue> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_locked: isLocked })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
