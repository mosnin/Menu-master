import { supabase } from '@/lib/db/client';
import type { CollaboratorInvite, InviteStatus } from '@/types';

const TABLE = 'collaborator_invites';

export async function findByTransactionId(
  transactionId: string,
): Promise<CollaboratorInvite[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByEmail(
  email: string,
): Promise<CollaboratorInvite[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByToken(
  token: string,
): Promise<CollaboratorInvite | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<CollaboratorInvite, 'id' | 'created_at' | 'updated_at'>,
): Promise<CollaboratorInvite> {
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
  status: InviteStatus,
): Promise<CollaboratorInvite> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
