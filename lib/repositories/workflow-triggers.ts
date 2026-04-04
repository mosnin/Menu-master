import { supabase } from '@/lib/db/client';
import type { WorkflowTrigger, WorkflowTriggerEventType } from '@/types';

const TABLE = 'workflow_triggers';

export async function findByWorkflowVersionId(
  versionId: string,
): Promise<WorkflowTrigger[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_version_id', versionId);

  if (error) throw error;
  return data ?? [];
}

export async function findByEventType(
  orgId: string,
  eventType: WorkflowTriggerEventType,
): Promise<WorkflowTrigger[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .eq('event_type', eventType)
    .eq('is_active', true);

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<WorkflowTrigger, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkflowTrigger> {
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
  input: Partial<Omit<WorkflowTrigger, 'id' | 'created_at' | 'updated_at'>>,
): Promise<WorkflowTrigger> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateByWorkflowId(
  workflowId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false })
    .eq('workflow_id', workflowId);

  if (error) throw error;
}
