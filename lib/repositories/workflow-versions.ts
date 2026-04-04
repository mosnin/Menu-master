import { supabase } from '@/lib/db/client';
import type { WorkflowVersion } from '@/types';

const TABLE = 'workflow_versions';

export async function findById(id: string): Promise<WorkflowVersion | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByWorkflowId(
  workflowId: string,
): Promise<WorkflowVersion[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findLatestByWorkflowId(
  workflowId: string,
): Promise<WorkflowVersion | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findPublishedByWorkflowId(
  workflowId: string,
): Promise<WorkflowVersion | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('status', 'published')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<WorkflowVersion, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkflowVersion> {
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
  input: Partial<Omit<WorkflowVersion, 'id' | 'created_at' | 'updated_at'>>,
): Promise<WorkflowVersion> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
