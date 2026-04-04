import { supabase } from '@/lib/db/client';
import type { OrchestratorWorldState } from '@/types';

const TABLE = 'orchestrator_world_states';

export async function create(
  input: Omit<OrchestratorWorldState, 'id' | 'created_at'>,
): Promise<OrchestratorWorldState> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findLatestByOrchestrator(
  orchestratorId: string,
): Promise<OrchestratorWorldState | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 20,
): Promise<OrchestratorWorldState[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
