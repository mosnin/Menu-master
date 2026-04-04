import { supabase } from '@/lib/db/client';
import type { DealOrchestrator, OrchestratorEntityType } from '@/types';

const TABLE = 'deal_orchestrators';

export async function findById(
  id: string,
): Promise<DealOrchestrator | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByEntity(
  entityType: OrchestratorEntityType,
  entityId: string,
): Promise<DealOrchestrator | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
): Promise<DealOrchestrator[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findActive(): Promise<DealOrchestrator[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findActiveByOrgId(
  orgId: string,
): Promise<DealOrchestrator[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<DealOrchestrator, 'id' | 'created_at' | 'updated_at'>,
): Promise<DealOrchestrator> {
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
  updates: Partial<Omit<DealOrchestrator, 'id' | 'created_at' | 'updated_at'>>,
): Promise<DealOrchestrator> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function upsertByEntity(
  input: Omit<DealOrchestrator, 'id' | 'created_at' | 'updated_at'>,
): Promise<DealOrchestrator> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(input, { onConflict: 'entity_type,entity_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
