import { supabase } from '@/lib/db/client';
import type { OrchestratorActionProposal, OrchestratorActionExecution } from '@/types';

const PROPOSALS_TABLE = 'orchestrator_action_proposals';
const EXECUTIONS_TABLE = 'orchestrator_action_executions';

export async function createProposal(
  input: Omit<OrchestratorActionProposal, 'id' | 'created_at'>,
): Promise<OrchestratorActionProposal> {
  const { data, error } = await supabase
    .from(PROPOSALS_TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<OrchestratorActionProposal, 'id' | 'created_at'>>,
): Promise<OrchestratorActionProposal> {
  const { data, error } = await supabase
    .from(PROPOSALS_TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findProposalsByCycle(
  cycleId: string,
): Promise<OrchestratorActionProposal[]> {
  const { data, error } = await supabase
    .from(PROPOSALS_TABLE)
    .select('*')
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createExecution(
  input: Omit<OrchestratorActionExecution, 'id' | 'created_at'>,
): Promise<OrchestratorActionExecution> {
  const { data, error } = await supabase
    .from(EXECUTIONS_TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findExecutionsByOrchestrator(
  orchestratorId: string,
  limit = 20,
): Promise<OrchestratorActionExecution[]> {
  const { data, error } = await supabase
    .from(EXECUTIONS_TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
