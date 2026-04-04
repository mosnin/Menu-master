import { supabase } from '@/lib/db/client';
import type { PolicyRule } from '@/types';

const TABLE = 'policy_rules';

export async function findByOrgId(
  orgId: string,
): Promise<PolicyRule[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findActiveByOrg(
  orgId: string,
  officeId?: string,
): Promise<PolicyRule[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (officeId) {
    query = query.or(`office_id.eq.${officeId},office_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function findById(
  id: string,
): Promise<PolicyRule | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<PolicyRule, 'id' | 'created_at' | 'updated_at'>,
): Promise<PolicyRule> {
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
  updates: Partial<Omit<PolicyRule, 'id' | 'created_at' | 'updated_at'>>,
): Promise<PolicyRule> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
