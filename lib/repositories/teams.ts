import { supabase } from '@/lib/db/client';
import type { Team } from '@/types';

const TABLE = 'teams';

export async function findByOrgId(orgId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findByOfficeId(officeId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('office_id', officeId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<Team, 'id' | 'created_at' | 'updated_at'>,
): Promise<Team> {
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
  input: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Team> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
