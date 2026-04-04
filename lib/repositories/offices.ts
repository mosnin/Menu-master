import { supabase } from '@/lib/db/client';
import type { Office } from '@/types';

const TABLE = 'offices';

export async function findByOrgId(orgId: string): Promise<Office[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<Office | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<Office, 'id' | 'created_at' | 'updated_at'>,
): Promise<Office> {
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
  input: Partial<Omit<Office, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Office> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
