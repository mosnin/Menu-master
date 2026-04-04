import { supabase } from '@/lib/db/client';
import type { TeamInvite } from '@/types';

const TABLE = 'team_invites';

export async function findByToken(
  token: string,
): Promise<TeamInvite | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('invite_token', token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByEmail(
  email: string,
): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findPendingByEmail(
  email: string,
): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgId(
  orgId: string,
): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<TeamInvite, 'id' | 'invite_token' | 'created_at' | 'updated_at'>,
): Promise<TeamInvite> {
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
  updates: Partial<Pick<TeamInvite, 'status' | 'accepted_at'>>,
): Promise<TeamInvite> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
