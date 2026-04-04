import { supabase } from '@/lib/db/client';
import type { CommissionSplit } from '@/types';

const TABLE = 'commission_splits';

export async function findByEconomicsId(
  economicsId: string,
): Promise<CommissionSplit[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('economics_id', economicsId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<CommissionSplit, 'id' | 'created_at'>,
): Promise<CommissionSplit> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteByEconomicsId(economicsId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('economics_id', economicsId);

  if (error) throw error;
}
