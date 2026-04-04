import { supabase } from '@/lib/db/client';
import type { FieldCorrection } from '@/types';

const TABLE = 'field_corrections';

export async function findByFieldValueId(
  fieldValueId: string,
): Promise<FieldCorrection[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('field_value_id', fieldValueId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<FieldCorrection, 'id' | 'created_at'>,
): Promise<FieldCorrection> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
