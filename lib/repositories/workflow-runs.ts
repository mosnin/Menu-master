import { supabase } from '@/lib/db/client';
import type { WorkflowRun, WorkflowRunStatus } from '@/types';

const TABLE = 'workflow_runs';

export async function findById(id: string): Promise<WorkflowRun | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByOrgId(
  orgId: string,
  options?: { status?: WorkflowRunStatus; limit?: number; offset?: number },
): Promise<WorkflowRun[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findByWorkflowId(
  workflowId: string,
  options?: { limit?: number },
): Promise<WorkflowRun[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findByEntityId(
  entityType: string,
  entityId: string,
): Promise<WorkflowRun[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<WorkflowRun, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkflowRun> {
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
  input: Partial<Omit<WorkflowRun, 'id' | 'created_at' | 'updated_at'>>,
): Promise<WorkflowRun> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
