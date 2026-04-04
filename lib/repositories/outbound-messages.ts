import { supabase } from '@/lib/db/client';
import type { OutboundMessage } from '@/types';

const TABLE = 'outbound_messages';

export async function findById(id: string): Promise<OutboundMessage | null> {
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
): Promise<OutboundMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<OutboundMessage, 'id' | 'created_at' | 'updated_at'>,
): Promise<OutboundMessage> {
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
  input: Partial<Omit<OutboundMessage, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OutboundMessage> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findPendingSend(): Promise<OutboundMessage[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'approved')
    .or(`send_after.is.null,send_after.lte.${now}`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
