import { supabase } from '@/lib/db/client';
import type { OrchestratorOrgProfile } from '@/types';

const TABLE = 'orchestrator_org_profiles';

export async function findByOrg(
  orgId: string,
): Promise<OrchestratorOrgProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function upsert(
  orgId: string,
  input: Partial<Omit<OrchestratorOrgProfile, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<OrchestratorOrgProfile> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        organization_id: orgId,
        ...input,
        last_profile_update_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getOrCreate(
  orgId: string,
): Promise<OrchestratorOrgProfile> {
  const existing = await findByOrg(orgId);
  if (existing) return existing;

  const defaults: Omit<OrchestratorOrgProfile, 'id' | 'created_at' | 'updated_at'> = {
    organization_id: orgId,
    preferred_escalation_timing: 'normal',
    common_blocker_types: [],
    commonly_ignored_actions: [],
    strict_manual_review: false,
    compliance_sensitivity: 'normal',
    confidence_threshold_adjustment: 0,
    urgency_bias: 'neutral',
    specialist_routing_sensitivity: 'normal',
    common_successful_patterns: [],
    common_failure_patterns: [],
    total_cycles_analyzed: 0,
    last_profile_update_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(defaults)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
