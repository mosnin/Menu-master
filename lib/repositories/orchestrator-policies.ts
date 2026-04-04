import { supabase } from '@/lib/db/client';
import type { OrgPolicyOverrides } from '@/types';

const TABLE = 'orchestrator_action_policies';

export interface OrchestratorActionPolicyRow {
  id: string;
  organization_id: string;
  policy_name: string;
  promoted_to_safe: string[];
  demoted_to_blocked: string[];
  require_approval_for: string[];
  custom_rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Find the active policy for an organization.
 * Returns the first active policy found (there should typically be one per org).
 */
export async function findByOrg(orgId: string): Promise<OrchestratorActionPolicyRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Convert a policy row into the OrgPolicyOverrides shape used by the policy engine.
 */
export function toOrgPolicyOverrides(row: OrchestratorActionPolicyRow): OrgPolicyOverrides {
  return {
    promoted_to_safe: row.promoted_to_safe,
    demoted_to_blocked: row.demoted_to_blocked,
    require_approval_for: row.require_approval_for,
  };
}

/**
 * Create a new policy for an organization.
 */
export async function create(
  input: Omit<OrchestratorActionPolicyRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorActionPolicyRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing policy.
 */
export async function update(
  id: string,
  updates: Partial<Omit<OrchestratorActionPolicyRow, 'id' | 'created_at'>>,
): Promise<OrchestratorActionPolicyRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
