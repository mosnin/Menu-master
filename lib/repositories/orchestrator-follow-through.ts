import { supabase } from '@/lib/db/client';
import type { FollowThroughRun, SequenceStatus } from '@/types';

const TABLE = 'orchestrator_follow_through_runs';

export async function create(
  input: Omit<FollowThroughRun, 'id' | 'started_at' | 'created_at' | 'updated_at'>,
): Promise<FollowThroughRun> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findById(id: string): Promise<FollowThroughRun | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findActiveByOrchestrator(
  orchestratorId: string,
): Promise<FollowThroughRun[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .in('status', ['active', 'waiting'])
    .order('started_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findWaitingPastDue(): Promise<FollowThroughRun[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'waiting')
    .lt('next_step_at', new Date().toISOString())
    .order('next_step_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function update(
  id: string,
  updates: Partial<Omit<FollowThroughRun, 'id' | 'created_at'>>,
): Promise<FollowThroughRun> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function cancel(id: string): Promise<FollowThroughRun> {
  return update(id, {
    status: 'cancelled' as SequenceStatus,
    exit_reason: 'Manually cancelled',
    completed_at: new Date().toISOString(),
  });
}

export async function complete(id: string, exitReason: string): Promise<FollowThroughRun> {
  return update(id, {
    status: 'completed' as SequenceStatus,
    exit_reason: exitReason,
    completed_at: new Date().toISOString(),
  });
}
