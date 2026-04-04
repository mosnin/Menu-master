import { supabase } from '@/lib/db/client';
import type { OrchestratorSpecialistTrace } from '@/types';

const TABLE = 'orchestrator_specialist_traces';

export async function create(
  input: Omit<OrchestratorSpecialistTrace, 'id' | 'created_at'>,
): Promise<OrchestratorSpecialistTrace> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByCycle(
  cycleId: string,
): Promise<OrchestratorSpecialistTrace[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 50,
): Promise<OrchestratorSpecialistTrace[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
