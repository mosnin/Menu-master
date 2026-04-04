import { supabase } from '@/lib/db/client';
import type { OrchestratorObligation } from '@/types';

const TABLE = 'orchestrator_obligations';

export async function create(
  input: Omit<OrchestratorObligation, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrchestratorObligation> {
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
  updates: Partial<Omit<OrchestratorObligation, 'id' | 'created_at' | 'updated_at'>>,
): Promise<OrchestratorObligation> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findOpen(
  orchestratorId: string,
): Promise<OrchestratorObligation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findOverdue(
  orchestratorId: string,
): Promise<OrchestratorObligation[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('status', 'open')
    .not('due_at', 'is', null)
    .lt('due_at', new Date().toISOString())
    .order('due_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fulfill(
  id: string,
): Promise<OrchestratorObligation> {
  return update(id, { status: 'fulfilled', fulfilled_at: new Date().toISOString() });
}
