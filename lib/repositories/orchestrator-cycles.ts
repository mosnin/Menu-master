import { supabase } from '@/lib/db/client';
import type { OrchestratorCycle } from '@/types';

const TABLE = 'orchestrator_cycles';

export async function create(
  input: Omit<OrchestratorCycle, 'id' | 'created_at'>,
): Promise<OrchestratorCycle> {
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
  updates: Partial<Omit<OrchestratorCycle, 'id' | 'created_at'>>,
): Promise<OrchestratorCycle> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findById(
  id: string,
): Promise<OrchestratorCycle | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 20,
): Promise<OrchestratorCycle[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findLatest(
  orchestratorId: string,
): Promise<OrchestratorCycle | null> {
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
