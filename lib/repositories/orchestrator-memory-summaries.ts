import { supabase } from '@/lib/db/client';
import type { OrchestratorMemorySummary, MemorySummaryType } from '@/types';

const TABLE = 'orchestrator_memory_summaries';

export async function create(
  input: Omit<OrchestratorMemorySummary, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorMemorySummary> {
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
  activeOnly = true,
  limit = 20,
): Promise<OrchestratorMemorySummary[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query
    .order('relevance_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function findByType(
  orchestratorId: string,
  summaryType: MemorySummaryType,
): Promise<OrchestratorMemorySummary[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('summary_type', summaryType)
    .eq('is_active', true)
    .order('relevance_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deactivate(
  id: string,
): Promise<OrchestratorMemorySummary> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateAll(
  orchestratorId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('orchestrator_id', orchestratorId)
    .eq('is_active', true);

  if (error) throw error;
}
