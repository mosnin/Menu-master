import { supabase } from '@/lib/db/client';
import type { Workflow, WorkflowStatus } from '@/types';

const TABLE = 'workflows';

export async function findById(id: string): Promise<Workflow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
  options?: { isActive?: boolean },
): Promise<Workflow[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>,
): Promise<Workflow> {
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
  input: Partial<Omit<Workflow, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Workflow> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
