import { supabase } from '@/lib/db/client';
import type { OrchestratorCounterpartySignal, CounterpartyType } from '@/types';

const TABLE = 'orchestrator_counterparty_signals';

export async function create(
  input: Omit<OrchestratorCounterpartySignal, 'id' | 'created_at'>,
): Promise<OrchestratorCounterpartySignal> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByOrchestrator(
  orchestratorId: string,
  limit = 50,
): Promise<OrchestratorCounterpartySignal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByCounterpartyType(
  orgId: string,
  counterpartyType: CounterpartyType,
  limit = 50,
): Promise<OrchestratorCounterpartySignal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('counterparty_type', counterpartyType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
