import { supabase } from '@/lib/db/client';
import type { OrchestratorSubgoal, PlanProgress } from '@/types';

const TABLE = 'orchestrator_subgoals';

export async function create(
  input: Omit<OrchestratorSubgoal, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorSubgoal> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByPlan(
  planId: string,
): Promise<OrchestratorSubgoal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findById(
  id: string,
): Promise<OrchestratorSubgoal | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  updates: Partial<Omit<OrchestratorSubgoal, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OrchestratorSubgoal> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function block(
  id: string,
  reason: string,
): Promise<OrchestratorSubgoal> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'blocked' as const,
      blocked_reason: reason,
      blocked_since: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function complete(
  id: string,
): Promise<OrchestratorSubgoal> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function skip(
  id: string,
): Promise<OrchestratorSubgoal> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'skipped' as const,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function computeProgress(
  planId: string,
): Promise<PlanProgress> {
  const subgoals = await findByPlan(planId);
  const total = subgoals.length;

  const counts = {
    pending: 0,
    in_progress: 0,
    waiting: 0,
    blocked: 0,
    completed: 0,
    skipped: 0,
  };

  for (const sg of subgoals) {
    counts[sg.status] = (counts[sg.status] ?? 0) + 1;
  }

  const completionPercentage =
    total === 0
      ? 0
      : Math.round(((counts.completed + counts.skipped) / total) * 100);

  return {
    total_subgoals: total,
    ...counts,
    completion_percentage: completionPercentage,
  };
}
