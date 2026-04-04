import { supabase } from '@/lib/db/client';
import type { WorkflowRunStep } from '@/types';

const TABLE = 'workflow_run_steps';

export async function findByRunId(
  runId: string,
): Promise<WorkflowRunStep[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('workflow_run_id', runId)
    .order('step_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findById(id: string): Promise<WorkflowRunStep | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  input: Omit<WorkflowRunStep, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkflowRunStep> {
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
  input: Partial<Omit<WorkflowRunStep, 'id' | 'created_at' | 'updated_at'>>,
): Promise<WorkflowRunStep> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
