import { supabase } from '@/lib/db/client';
import type { OrchestratorCounterpartyProfile } from '@/types';

const TABLE = 'orchestrator_counterparty_profiles';

export async function findByOrg(
  orgId: string,
): Promise<OrchestratorCounterpartyProfile[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('total_interactions', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByType(
  orgId: string,
  counterpartyType: string,
): Promise<OrchestratorCounterpartyProfile[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('counterparty_type', counterpartyType)
    .order('total_interactions', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsert(
  input: Omit<OrchestratorCounterpartyProfile, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorCounterpartyProfile> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { ...input, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,counterparty_type,counterparty_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
