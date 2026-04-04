import { supabase } from '@/lib/db/client';
import type { CommunicationMessage } from '@/types';

const TABLE = 'communication_messages';

export async function findByThreadId(
  threadId: string,
): Promise<CommunicationMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<CommunicationMessage, 'id' | 'created_at'>,
): Promise<CommunicationMessage> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByExternalId(
  externalMessageId: string,
): Promise<CommunicationMessage | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('external_message_id', externalMessageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
