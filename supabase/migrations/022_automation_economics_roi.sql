-- =============================================================================
-- Migration 022: Automation economics and ROI analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_value_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('workflow', 'workflow_version', 'template', 'playbook')),
  asset_ref TEXT NOT NULL,
  value_category TEXT NOT NULL CHECK (value_category IN ('manual_step_avoided','review_time_saved','coordination_time_saved','follow_up_time_saved','queue_reduction','reduced_delay_risk','reduced_manual_rework','reduced_override_load')),
  source_table TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  measured_value NUMERIC NOT NULL DEFAULT 0,
  estimated_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  assumptions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, asset_type, asset_ref, value_category, source_table, source_record_id)
);
CREATE INDEX IF NOT EXISTS idx_automation_value_records_org_asset ON automation_value_records(organization_id, asset_type, asset_ref, recorded_at DESC);

CREATE TABLE IF NOT EXISTS automation_time_saved_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'office', 'team', 'workflow')),
  scope_ref TEXT NOT NULL,
  gross_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  review_minutes_cost NUMERIC NOT NULL DEFAULT 0,
  correction_minutes_cost NUMERIC NOT NULL DEFAULT 0,
  net_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  assumption_key TEXT NOT NULL,
  assumption_value NUMERIC NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_time_saved_org_scope ON automation_time_saved_estimates(organization_id, scope_type, scope_ref, window_end DESC);

CREATE TABLE IF NOT EXISTS automation_manual_work_displacement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NULL REFERENCES workflows(id) ON DELETE SET NULL,
  workflow_version_id UUID NULL REFERENCES workflow_versions(id) ON DELETE SET NULL,
  office_id UUID NULL REFERENCES offices(id) ON DELETE SET NULL,
  team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  fully_automated_count INTEGER NOT NULL DEFAULT 0,
  assisted_count INTEGER NOT NULL DEFAULT 0,
  review_required_count INTEGER NOT NULL DEFAULT 0,
  override_count INTEGER NOT NULL DEFAULT 0,
  correction_count INTEGER NOT NULL DEFAULT 0,
  avoided_manual_steps INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_displacement_org_window ON automation_manual_work_displacement(organization_id, window_end DESC);

CREATE TABLE IF NOT EXISTS automation_roi_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('workflow', 'workflow_version', 'template', 'playbook', 'office', 'team', 'organization')),
  asset_ref TEXT NOT NULL,
  run_volume INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC NOT NULL DEFAULT 0,
  override_rate NUMERIC NOT NULL DEFAULT 0,
  correction_burden_rate NUMERIC NOT NULL DEFAULT 0,
  gross_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  net_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  estimated_value_score NUMERIC NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  assumptions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, asset_type, asset_ref, window_start, window_end)
);
CREATE INDEX IF NOT EXISTS idx_automation_roi_org_asset ON automation_roi_summaries(organization_id, asset_type, window_end DESC);

CREATE TABLE IF NOT EXISTS automation_cost_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'office', 'team', 'workflow')),
  scope_ref TEXT NOT NULL,
  workflow_execution_volume INTEGER NOT NULL DEFAULT 0,
  simulation_volume INTEGER NOT NULL DEFAULT 0,
  nl_generation_volume INTEGER NOT NULL DEFAULT 0,
  agent_node_usage INTEGER NOT NULL DEFAULT 0,
  retry_overhead INTEGER NOT NULL DEFAULT 0,
  failure_overhead INTEGER NOT NULL DEFAULT 0,
  override_burden INTEGER NOT NULL DEFAULT 0,
  estimated_cost_units NUMERIC NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_cost_signals_org_scope ON automation_cost_signals(organization_id, scope_type, scope_ref, window_end DESC);

CREATE TABLE IF NOT EXISTS automation_negative_value_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('workflow', 'template', 'playbook')),
  asset_ref TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('high_override_rate','high_correction_rate','high_failure_rate','low_draft_acceptance','low_usage','frequent_manual_cleanup','low_value_relative_to_burden')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'major', 'critical')),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('review', 'simplify', 'deprecate', 'assist_only')),
  details TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  threshold_value NUMERIC NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_negative_signals_org_asset ON automation_negative_value_signals(organization_id, asset_type, asset_ref, window_end DESC);

CREATE TABLE IF NOT EXISTS template_value_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_ref TEXT NOT NULL,
  adoption_count INTEGER NOT NULL DEFAULT 0,
  workflow_count INTEGER NOT NULL DEFAULT 0,
  net_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  churn_signal_count INTEGER NOT NULL DEFAULT 0,
  value_rank NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_ref)
);

CREATE TABLE IF NOT EXISTS playbook_value_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  playbook_ref TEXT NOT NULL,
  adoption_count INTEGER NOT NULL DEFAULT 0,
  workflow_count INTEGER NOT NULL DEFAULT 0,
  net_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  churn_signal_count INTEGER NOT NULL DEFAULT 0,
  value_rank NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, playbook_ref)
);

CREATE TABLE IF NOT EXISTS office_automation_leverage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  runs_per_operator NUMERIC NOT NULL DEFAULT 0,
  assisted_workload_share NUMERIC NOT NULL DEFAULT 0,
  net_minutes_saved NUMERIC NOT NULL DEFAULT 0,
  incident_burden NUMERIC NOT NULL DEFAULT 0,
  value_concentration NUMERIC NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_office_leverage_org ON office_automation_leverage_summaries(organization_id, office_id, window_end DESC);

CREATE TABLE IF NOT EXISTS organization_automation_value_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  generated_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  assumptions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_value_reports_org ON organization_automation_value_reports(organization_id, created_at DESC);
