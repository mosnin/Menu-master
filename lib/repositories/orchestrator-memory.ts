import { supabase } from '@/lib/db/client';
import type { OrchestratorMemoryEntry, MemoryEntryType } from '@/types';

const TABLE = 'orchestrator_memory_entries';

export async function create(
  input: Omit<OrchestratorMemoryEntry, 'id' | 'created_at'>,
): Promise<OrchestratorMemoryEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findUnresolved(
  orchestratorId: string,
): Promise<OrchestratorMemoryEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findByType(
  orchestratorId: string,
  memoryType: MemoryEntryType,
): Promise<OrchestratorMemoryEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .eq('memory_type', memoryType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findRecent(
  orchestratorId: string,
  limit = 20,
): Promise<OrchestratorMemoryEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function resolve(
  id: string,
): Promise<OrchestratorMemoryEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
