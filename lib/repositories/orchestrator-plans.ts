import { supabase } from '@/lib/db/client';
import type { OrchestratorPlan } from '@/types';

const TABLE = 'orchestrator_plans';

export async function create(
  input: Omit<OrchestratorPlan, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findById(
  id: string,
): Promise<OrchestratorPlan | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findActivePlan(
  orchestratorId: string,
): Promise<OrchestratorPlan | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .in('status', ['active', 'draft', 'waiting', 'blocked'])
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrchestrator(
  orchestratorId: string,
): Promise<OrchestratorPlan[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  updates: Partial<Omit<OrchestratorPlan, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function supersede(
  planId: string,
  newPlanId: string,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'superseded' as const,
      superseded_by: newPlanId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function block(
  planId: string,
  reason: string,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'blocked' as const,
      blocked_reason: reason,
      blocked_since: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function complete(
  planId: string,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function cancel(
  planId: string,
): Promise<OrchestratorPlan> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'cancelled' as const,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
