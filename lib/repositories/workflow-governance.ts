import { supabase } from '@/lib/db/client';
import type { GovernanceAssignmentType, GovernanceScopeType } from '@/lib/validation/workflow-governance';

export async function upsertScope(input: {
  organization_id: string;
  scope_type: GovernanceScopeType;
  scope_ref: string;
  parent_scope_id?: string | null;
  scope_name: string;
  scope_config_json?: Record<string, unknown>;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase
    .from('automation_governance_scopes')
    .upsert({ ...input, scope_config_json: input.scope_config_json ?? {} }, { onConflict: 'organization_id,scope_type,scope_ref' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listScopes(orgId: string) {
  const { data, error } = await supabase
    .from('automation_governance_scopes')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findScope(orgId: string, scopeType: GovernanceScopeType, scopeRef: string) {
  const { data, error } = await supabase
    .from('automation_governance_scopes')
    .select('*')
    .eq('organization_id', orgId)
    .eq('scope_type', scopeType)
    .eq('scope_ref', scopeRef)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAssignment(input: {
  organization_id: string;
  scope_id: string;
  assignment_type: GovernanceAssignmentType;
  asset_type?: 'workflow' | 'template' | 'playbook' | null;
  asset_ref?: string | null;
  office_id?: string | null;
  team_id?: string | null;
  assigned_user_id: string;
  assigned_role: string;
  status: 'active' | 'inactive' | 'revoked';
  assigned_by_user_id: string;
  note?: string | null;
}) {
  const { data, error } = await supabase
    .from('automation_governance_assignments')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listAssignments(orgId: string) {
  const { data, error } = await supabase
    .from('automation_governance_assignments')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createChain(input: {
  organization_id: string;
  scope_id: string;
  chain_name: string;
  asset_type: 'workflow' | 'template' | 'playbook';
  risk_level: 'safe' | 'medium_risk' | 'high_risk';
  created_by_user_id: string;
}) {
  const { data, error } = await supabase
    .from('automation_approval_chains')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createChainStep(input: {
  organization_id: string;
  chain_id: string;
  step_order: number;
  step_mode: 'sequential' | 'parallel';
  required_role: string;
  required_assignment_type?: string | null;
  requires_distinct_user: boolean;
  rationale?: string | null;
}) {
  const { data, error } = await supabase.from('automation_approval_chain_steps').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function listChains(orgId: string) {
  const { data, error } = await supabase.from('automation_approval_chains').select('*').eq('organization_id', orgId).eq('active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listRoutes(orgId: string) {
  const { data, error } = await supabase.from('automation_reviewer_routes').select('*').eq('organization_id', orgId).eq('active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRoute(input: {
  organization_id: string;
  route_type: 'approval' | 'attestation' | 'governance_issue';
  scope_id: string;
  risk_level: 'safe' | 'medium_risk' | 'high_risk';
  target_assignment_type: string;
  fallback_role: string;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase.from('automation_reviewer_routes').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createConflict(input: {
  organization_id: string;
  asset_type: 'workflow' | 'template' | 'playbook';
  asset_ref: string;
  conflict_type: 'missing_owner' | 'missing_reviewer_route' | 'sod_violation' | 'scope_boundary_violation' | 'approval_chain_gap';
  severity: 'warning' | 'major' | 'critical';
  details: string;
  status?: 'open' | 'in_review' | 'resolved' | 'dismissed';
  metadata_json?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.from('automation_governance_conflicts').insert({ ...input, status: input.status ?? 'open', metadata_json: input.metadata_json ?? {} }).select('*').single();
  if (error) throw error;
  return data;
}

export async function listConflicts(orgId: string, status: 'open' | 'in_review' | 'resolved' | 'dismissed' = 'open') {
  const { data, error } = await supabase.from('automation_governance_conflicts').select('*').eq('organization_id', orgId).eq('status', status).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEvent(input: {
  organization_id: string;
  scope_id?: string | null;
  event_type: string;
  actor_user_id: string;
  target_type: string;
  target_ref: string;
  note?: string | null;
  metadata_json?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.from('automation_governance_events').insert({ ...input, metadata_json: input.metadata_json ?? {} }).select('*').single();
  if (error) throw error;
  return data;
}
