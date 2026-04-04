import { supabase } from '@/lib/db/client';
import type { OrchestratorNextAction } from '@/types';

const TABLE = 'orchestrator_next_actions';

export async function create(
  input: Omit<OrchestratorNextAction, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorNextAction> {
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
  updates: Partial<Omit<OrchestratorNextAction, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OrchestratorNextAction> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findActive(
  orchestratorId: string,
): Promise<OrchestratorNextAction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('urgency', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findPrimary(
  orchestratorId: string,
): Promise<OrchestratorNextAction | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('status', 'active')
    .eq('is_primary', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function staleAll(
  orchestratorId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'stale', updated_at: new Date().toISOString() })
    .eq('orchestrator_id', orchestratorId)
    .eq('status', 'active');

  if (error) throw error;
}

export async function resolve(
  id: string,
): Promise<OrchestratorNextAction> {
  return update(id, { status: 'resolved', resolved_at: new Date().toISOString() });
}

export async function dismiss(
  id: string,
): Promise<OrchestratorNextAction> {
  return update(id, { status: 'dismissed' });
}
