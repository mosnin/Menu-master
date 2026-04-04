import { supabase } from '@/lib/db/client';
import type { OrchestratorActionScore } from '@/types';

const TABLE = 'orchestrator_action_scores';

export async function findByOrg(
  orgId: string,
  limit = 100,
): Promise<OrchestratorActionScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('effectiveness_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByToolName(
  orgId: string,
  toolName: string,
): Promise<OrchestratorActionScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('tool_name', toolName)
    .order('effectiveness_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsert(
  input: Omit<OrchestratorActionScore, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorActionScore> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, {
      onConflict: 'organization_id,tool_name,entity_type,stage,blocker_type,counterparty_type',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findTopEffective(
  orgId: string,
  limit = 10,
): Promise<OrchestratorActionScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('effectiveness_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findLeastEffective(
  orgId: string,
  limit = 10,
): Promise<OrchestratorActionScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('effectiveness_score', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
