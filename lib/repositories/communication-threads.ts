import { supabase } from '@/lib/db/client';
import type { CommunicationThread, LinkedBy } from '@/types';

const TABLE = 'communication_threads';

export async function findByTransactionId(
  transactionId: string,
): Promise<CommunicationThread[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
): Promise<CommunicationThread[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<CommunicationThread, 'id' | 'created_at' | 'updated_at'>,
): Promise<CommunicationThread> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateLink(
  id: string,
  transactionId: string,
  linkedBy: LinkedBy,
  linkConfidence?: number,
): Promise<CommunicationThread> {
  const updates: Record<string, unknown> = {
    transaction_id: transactionId,
    is_linked: true,
    linked_by: linkedBy,
  };
  if (linkConfidence !== undefined) {
    updates.link_confidence = linkConfidence;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
