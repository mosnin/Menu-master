import { supabase } from '@/lib/db/client';

export async function upsertRoiSummary(input: {
  organization_id: string;
  asset_type: 'workflow' | 'workflow_version' | 'template' | 'playbook' | 'office' | 'team' | 'organization';
  asset_ref: string;
  run_volume: number;
  success_rate: number;
  override_rate: number;
  correction_burden_rate: number;
  gross_minutes_saved: number;
  net_minutes_saved: number;
  estimated_value_score: number;
  confidence: 'low' | 'medium' | 'high';
  assumptions_json: Record<string, unknown>;
  window_start: string;
  window_end: string;
}) {
  const { data, error } = await supabase
    .from('automation_roi_summaries')
    .upsert(input, { onConflict: 'organization_id,asset_type,asset_ref,window_start,window_end' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listRoiSummaries(orgId: string, input?: { assetType?: string; limit?: number }) {
  let query = supabase
    .from('automation_roi_summaries')
    .select('*')
    .eq('organization_id', orgId)
    .order('window_end', { ascending: false })
    .limit(input?.limit ?? 300);
  if (input?.assetType) query = query.eq('asset_type', input.assetType);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createValueRecord(input: {
  organization_id: string;
  asset_type: 'workflow' | 'workflow_version' | 'template' | 'playbook';
  asset_ref: string;
  value_category: 'manual_step_avoided' | 'review_time_saved' | 'coordination_time_saved' | 'follow_up_time_saved' | 'queue_reduction' | 'reduced_delay_risk' | 'reduced_manual_rework' | 'reduced_override_load';
  source_table: string;
  source_record_id: string;
  measured_value: number;
  estimated_minutes_saved: number;
  confidence: 'low' | 'medium' | 'high';
  assumptions_json?: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('automation_value_records')
    .upsert({ ...input, assumptions_json: input.assumptions_json ?? {}, metadata_json: input.metadata_json ?? {} }, { onConflict: 'organization_id,asset_type,asset_ref,value_category,source_table,source_record_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listValueRecords(orgId: string, limit = 400) {
  const { data, error } = await supabase
    .from('automation_value_records')
    .select('*')
    .eq('organization_id', orgId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function insertTimeSavedEstimate(input: {
  organization_id: string;
  action_type: string;
  scope_type: 'organization' | 'office' | 'team' | 'workflow';
  scope_ref: string;
  gross_minutes_saved: number;
  review_minutes_cost: number;
  correction_minutes_cost: number;
  net_minutes_saved: number;
  assumption_key: string;
  assumption_value: number;
  confidence: 'low' | 'medium' | 'high';
  window_start: string;
  window_end: string;
}) {
  const { data, error } = await supabase.from('automation_time_saved_estimates').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function insertManualDisplacement(input: {
  organization_id: string;
  workflow_id?: string | null;
  workflow_version_id?: string | null;
  office_id?: string | null;
  team_id?: string | null;
  fully_automated_count: number;
  assisted_count: number;
  review_required_count: number;
  override_count: number;
  correction_count: number;
  avoided_manual_steps: number;
  window_start: string;
  window_end: string;
}) {
  const { data, error } = await supabase.from('automation_manual_work_displacement').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function insertCostSignal(input: {
  organization_id: string;
  scope_type: 'organization' | 'office' | 'team' | 'workflow';
  scope_ref: string;
  workflow_execution_volume: number;
  simulation_volume: number;
  nl_generation_volume: number;
  agent_node_usage: number;
  retry_overhead: number;
  failure_overhead: number;
  override_burden: number;
  estimated_cost_units: number;
  window_start: string;
  window_end: string;
}) {
  const { data, error } = await supabase.from('automation_cost_signals').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function insertNegativeSignal(input: {
  organization_id: string;
  asset_type: 'workflow' | 'template' | 'playbook';
  asset_ref: string;
  signal_type: 'high_override_rate' | 'high_correction_rate' | 'high_failure_rate' | 'low_draft_acceptance' | 'low_usage' | 'frequent_manual_cleanup' | 'low_value_relative_to_burden';
  severity: 'warning' | 'major' | 'critical';
  recommendation: 'review' | 'simplify' | 'deprecate' | 'assist_only';
  details: string;
  metric_value: number;
  threshold_value: number;
  window_start: string;
  window_end: string;
}) {
  const { data, error } = await supabase.from('automation_negative_value_signals').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function listNegativeSignals(orgId: string, limit = 200) {
  const { data, error } = await supabase.from('automation_negative_value_signals').select('*').eq('organization_id', orgId).order('window_end', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
