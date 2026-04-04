import { supabase } from '@/lib/db/client';
import type { OrganizationRule } from '@/types';

const TABLE = 'organization_rules';

export async function findByOrgId(
  orgId: string,
): Promise<OrganizationRule[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findActiveByOrgIdAndType(
  orgId: string,
  ruleType: string,
): Promise<OrganizationRule[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('rule_type', ruleType)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<OrganizationRule, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrganizationRule> {
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
  input: Partial<Omit<OrganizationRule, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OrganizationRule> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
