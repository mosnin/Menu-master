import { supabase } from '@/lib/db/client';

export async function listRecommendationProfiles(orgId: string) {
  const { data, error } = await supabase
    .from('automation_recommendation_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOnboardingSession(input: {
  organization_id: string;
  office_id?: string | null;
  team_id?: string | null;
  session_name: string;
  recommendation_profile_id?: string | null;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase.from('automation_onboarding_sessions').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createSetupState(input: {
  organization_id: string;
  onboarding_session_id: string;
  package_version_id?: string | null;
  setup_mode: 'draft_only' | 'template_only' | 'library_copy';
  scope_type: 'organization' | 'office' | 'team';
  scope_ref: string;
  status: 'onboarding' | 'setup_blocked' | 'ready_for_activation' | 'pilot_active' | 'broadly_adopted' | 'underperforming';
  checklist_json: Record<string, unknown>;
  blockers_json: Array<Record<string, unknown>>;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase.from('automation_setup_states').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function upsertActivationChecklist(input: {
  organization_id: string;
  setup_state_id: string;
  package_version_id?: string | null;
  checklist_state: 'in_progress' | 'blocked' | 'ready' | 'completed';
  items_json: Array<Record<string, unknown>>;
  missing_items_json: string[];
  updated_by_user_id: string;
}) {
  const { data, error } = await supabase
    .from('automation_activation_checklists')
    .upsert({ ...input, checklist_type: 'activation_readiness', updated_at: new Date().toISOString() }, { onConflict: 'setup_state_id,checklist_type' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createBlocker(input: {
  organization_id: string;
  setup_state_id: string;
  blocker_type: string;
  severity: 'warning' | 'major' | 'critical';
  details: string;
  suggested_action?: string | null;
}) {
  const { data, error } = await supabase.from('automation_setup_blockers').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function upsertMilestone(input: {
  organization_id: string;
  setup_state_id: string;
  milestone_key: string;
  milestone_state: 'pending' | 'achieved';
  achieved_at?: string | null;
  signal_json: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('automation_first_value_milestones')
    .upsert(input, { onConflict: 'organization_id,setup_state_id,milestone_key' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createHealthSummary(input: {
  organization_id: string;
  setup_state_id: string;
  adoption_state: 'onboarding' | 'setup_blocked' | 'ready_for_activation' | 'pilot_active' | 'broadly_adopted' | 'underperforming';
  health_score: number;
  reasons: string[];
  recommendations_json: Array<Record<string, unknown>>;
}) {
  const { data, error } = await supabase.from('automation_adoption_health_summaries').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function createRolloutGuidance(input: {
  organization_id: string;
  setup_state_id: string;
  rollout_stage: 'single_office_pilot' | 'small_team_canary' | 'staged_office_rollout' | 'org_wide_rollout';
  guidance_text: string;
  next_action?: string | null;
  metadata_json?: Record<string, unknown>;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase
    .from('automation_rollout_guidance_records')
    .insert({ ...input, metadata_json: input.metadata_json ?? {} })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createActivationEvent(input: {
  organization_id: string;
  setup_state_id?: string | null;
  event_type: 'setup_started' | 'checklist_updated' | 'ready_for_activation' | 'activation_submitted' | 'activation_completed' | 'activation_rolled_back';
  actor_user_id: string;
  metadata_json?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('automation_activation_events')
    .insert({ ...input, metadata_json: input.metadata_json ?? {} })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createSuccessNote(input: {
  organization_id: string;
  setup_state_id?: string | null;
  note_type: 'support_note' | 'intervention' | 'handoff';
  visibility: 'internal' | 'customer_visible';
  note_text: string;
  created_by_user_id: string;
}) {
  const { data, error } = await supabase.from('automation_customer_success_notes').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function listSetupStates(orgId: string) {
  const { data, error } = await supabase
    .from('automation_setup_states')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function findSetupStateById(orgId: string, setupStateId: string) {
  const { data, error } = await supabase
    .from('automation_setup_states')
    .select('*')
    .eq('organization_id', orgId)
    .eq('id', setupStateId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSetupStateStatus(input: {
  organization_id: string;
  id: string;
  status: 'onboarding' | 'setup_blocked' | 'ready_for_activation' | 'pilot_active' | 'broadly_adopted' | 'underperforming';
  checklist_json: Record<string, unknown>;
  blockers_json: Array<Record<string, unknown>>;
}) {
  const { data, error } = await supabase
    .from('automation_setup_states')
    .update({
      status: input.status,
      checklist_json: input.checklist_json,
      blockers_json: input.blockers_json,
    })
    .eq('organization_id', input.organization_id)
    .eq('id', input.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listChecklists(orgId: string) {
  const { data, error } = await supabase
    .from('automation_activation_checklists')
    .select('*')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listBlockers(orgId: string) {
  const { data, error } = await supabase
    .from('automation_setup_blockers')
    .select('*')
    .eq('organization_id', orgId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listMilestones(orgId: string) {
  const { data, error } = await supabase
    .from('automation_first_value_milestones')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listHealthSummaries(orgId: string) {
  const { data, error } = await supabase
    .from('automation_adoption_health_summaries')
    .select('*')
    .eq('organization_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listRolloutGuidance(orgId: string) {
  const { data, error } = await supabase
    .from('automation_rollout_guidance_records')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listSuccessNotes(orgId: string) {
  const { data, error } = await supabase
    .from('automation_customer_success_notes')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
