import { supabase } from '@/lib/db/client';
import type { DocumentRequest, DocumentRequestStatus } from '@/types';

const TABLE = 'document_requests';

export async function findByTransactionId(
  transactionId: string,
): Promise<DocumentRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByToken(
  token: string,
): Promise<DocumentRequest | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
): Promise<DocumentRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DocumentRequest, 'id' | 'created_at' | 'updated_at'>,
): Promise<DocumentRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateStatus(
  id: string,
  status: DocumentRequestStatus,
): Promise<DocumentRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
