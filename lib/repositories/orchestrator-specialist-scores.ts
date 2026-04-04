import { supabase } from '@/lib/db/client';
import type { OrchestratorSpecialistScore } from '@/types';

const TABLE = 'orchestrator_specialist_scores';

export async function findByOrg(
  orgId: string,
): Promise<OrchestratorSpecialistScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('usefulness_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByRole(
  orgId: string,
  role: string,
): Promise<OrchestratorSpecialistScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('specialist_role', role)
    .order('usefulness_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsert(
  input: Omit<OrchestratorSpecialistScore, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorSpecialistScore> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { ...input, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,specialist_role,entity_type,stage,trigger_type' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findWithAdjustments(
  orgId: string,
): Promise<OrchestratorSpecialistScore[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .neq('priority_adjustment', 0)
    .order('priority_adjustment', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
