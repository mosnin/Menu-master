import { supabase } from '@/lib/db/client';
import type { WorkflowGraphData } from '@/types';
import type { WorkflowAuthoringIntent } from '@/lib/validation/workflow-authoring';

export async function createAuthoringSession(input: {
  organization_id: string;
  created_by_user_id: string;
  prompt_text: string;
}) {
  const { data, error } = await supabase
    .from('workflow_authoring_sessions')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createIntentRecord(input: {
  session_id: string;
  organization_id: string;
  created_by_user_id: string;
  intent_json: WorkflowAuthoringIntent;
}) {
  const { data, error } = await supabase
    .from('workflow_authoring_intents')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createGenerationAttempt(input: {
  session_id: string;
  organization_id: string;
  created_by_user_id: string;
  prompt_text: string;
  draft_graph_json: WorkflowGraphData;
  assumptions_json: string[];
  warnings_json: string[];
  missing_information_json: string[];
  validation_json: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('workflow_generation_attempts')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
