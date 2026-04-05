import { supabase } from '@/lib/db/client';

export interface AutomationTraceEventInput {
  organization_id: string;
  source_system: 'workflow' | 'orchestrator' | 'agent_node';
  status: 'proposed' | 'auto_execute' | 'create_draft' | 'create_approval' | 'block' | 'executed' | 'failed' | 'escalate';
  workflow_run_id?: string | null;
  workflow_run_step_id?: string | null;
  orchestrator_id?: string | null;
  orchestrator_cycle_id?: string | null;
  orchestrator_proposal_id?: string | null;
  orchestrator_execution_id?: string | null;
  tool_name?: string | null;
  tool_params?: Record<string, unknown>;
  policy_disposition?: string | null;
  policy_rule?: string | null;
  policy_reason?: string | null;
  outcome_summary?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createTraceEvent(input: AutomationTraceEventInput) {
  const { data, error } = await supabase
    .from('automation_trace_events')
    .insert({
      ...input,
      tool_params: input.tool_params ?? {},
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findByWorkflowRun(runId: string) {
  const { data, error } = await supabase
    .from('automation_trace_events')
    .select('*')
    .eq('workflow_run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findByOrchestrator(orchestratorId: string) {
  const { data, error } = await supabase
    .from('automation_trace_events')
    .select('*')
    .eq('orchestrator_id', orchestratorId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}
