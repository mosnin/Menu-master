import { supabase } from '@/lib/db/client';
import type { Document, ProcessingStatus } from '@/types';

const TABLE = 'documents';

export async function findById(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByTransactionId(
  transactionId: string,
): Promise<Document[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Document, 'id' | 'created_at' | 'updated_at'>,
): Promise<Document> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProcessingStatus(
  id: string,
  status: ProcessingStatus,
  documentType?: string,
): Promise<Document> {
  const updateData: Record<string, unknown> = { processing_status: status };
  if (documentType !== undefined) {
    updateData.document_type = documentType;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findRecentByOrgId(
  orgId: string,
  limit = 20,
): Promise<Document[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findWithExtractionIssues(
  orgId: string,
): Promise<Document[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .in('processing_status', ['failed', 'ocr_required', 'manual_review'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
