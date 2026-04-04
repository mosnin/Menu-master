import { supabase } from '@/lib/db/client';
import type { OfficeMembership } from '@/types';

const TABLE = 'office_memberships';

export async function findByUserId(userId: string): Promise<OfficeMembership[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOfficeId(officeId: string): Promise<OfficeMembership[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByTeamId(teamId: string): Promise<OfficeMembership[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<OfficeMembership, 'id' | 'created_at' | 'updated_at'>,
): Promise<OfficeMembership> {
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
  input: Partial<Omit<OfficeMembership, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OfficeMembership> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteById(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
