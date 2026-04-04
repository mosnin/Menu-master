import { supabase } from '@/lib/db/client';
import type { OrchestratorOutcome, OutcomeType } from '@/types';

const TABLE = 'orchestrator_outcomes';

export async function create(
  input: Omit<OrchestratorOutcome, 'id' | 'created_at' | 'outcome_measured_at'>,
): Promise<OrchestratorOutcome> {
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
): Promise<OrchestratorOutcome[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByProposal(
  proposalId: string,
): Promise<OrchestratorOutcome[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByExecution(
  executionId: string,
): Promise<OrchestratorOutcome[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrgAndType(
  orgId: string,
  outcomeType: OutcomeType,
  limit = 100,
): Promise<OrchestratorOutcome[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('outcome_type', outcomeType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findRecentByOrg(
  orgId: string,
  sinceDaysAgo = 90,
  limit = 200,
): Promise<OrchestratorOutcome[]> {
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
