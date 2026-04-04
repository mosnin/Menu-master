import { supabase } from '@/lib/db/client';
import type { Property } from '@/types';

const TABLE = 'properties';

export async function findById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<Property, 'id' | 'created_at' | 'updated_at'>,
): Promise<Property> {
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
  input: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Property> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
