import { supabase } from '@/lib/db/client';
import type { ChecklistTemplate } from '@/types';

const TABLE = 'checklist_templates';

export async function findById(
  id: string,
): Promise<ChecklistTemplate | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findDefault(): Promise<ChecklistTemplate | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('organization_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>,
): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
