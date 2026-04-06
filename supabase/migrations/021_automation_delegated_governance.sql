-- =============================================================================
-- Migration 021: Enterprise delegated automation governance
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_governance_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'office', 'team', 'workflow_family', 'automation_category', 'template_segment', 'playbook_segment')),
  scope_ref TEXT NOT NULL,
  parent_scope_id UUID NULL REFERENCES automation_governance_scopes(id) ON DELETE SET NULL,
  scope_name TEXT NOT NULL,
  scope_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, scope_type, scope_ref)
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_scopes_org ON automation_governance_scopes(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_gov_scopes_parent ON automation_governance_scopes(parent_scope_id);

CREATE TABLE IF NOT EXISTS automation_governance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_id UUID NOT NULL REFERENCES automation_governance_scopes(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('automation_owner', 'compliance_reviewer', 'release_reviewer', 'office_delegate', 'team_delegate', 'enterprise_admin_delegate')),
  asset_type TEXT NULL CHECK (asset_type IN ('workflow', 'template', 'playbook')),
  asset_ref TEXT NULL,
  office_id UUID NULL REFERENCES offices(id) ON DELETE SET NULL,
  team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  assigned_user_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'revoked')),
  assigned_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_assignments_org ON automation_governance_assignments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_gov_assignments_asset ON automation_governance_assignments(asset_type, asset_ref);

CREATE TABLE IF NOT EXISTS automation_approval_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_id UUID NOT NULL REFERENCES automation_governance_scopes(id) ON DELETE CASCADE,
  chain_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('workflow', 'template', 'playbook')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('safe','medium_risk','high_risk')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_chains_org ON automation_approval_chains(organization_id, asset_type, risk_level);

CREATE TABLE IF NOT EXISTS automation_approval_chain_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chain_id UUID NOT NULL REFERENCES automation_approval_chains(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_mode TEXT NOT NULL CHECK (step_mode IN ('sequential', 'parallel')),
  required_role TEXT NOT NULL,
  required_assignment_type TEXT NULL,
  requires_distinct_user BOOLEAN NOT NULL DEFAULT false,
  rationale TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chain_id, step_order, required_role)
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_chain_steps_chain ON automation_approval_chain_steps(chain_id, step_order);

CREATE TABLE IF NOT EXISTS automation_separation_of_duties_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_id UUID NOT NULL REFERENCES automation_governance_scopes(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  applies_to_risk TEXT NOT NULL CHECK (applies_to_risk IN ('safe','medium_risk','high_risk')),
  rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_code)
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_sod_org ON automation_separation_of_duties_rules(organization_id, scope_id);

CREATE TABLE IF NOT EXISTS automation_reviewer_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  route_type TEXT NOT NULL CHECK (route_type IN ('approval', 'attestation', 'governance_issue')),
  scope_id UUID NOT NULL REFERENCES automation_governance_scopes(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('safe','medium_risk','high_risk')),
  target_assignment_type TEXT NOT NULL,
  fallback_role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_routes_org ON automation_reviewer_routes(organization_id, scope_id, risk_level);

CREATE TABLE IF NOT EXISTS automation_governance_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('workflow', 'template', 'playbook')),
  asset_ref TEXT NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('missing_owner', 'missing_reviewer_route', 'sod_violation', 'scope_boundary_violation', 'approval_chain_gap')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'major', 'critical')),
  details TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_conflicts_org ON automation_governance_conflicts(organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS automation_governance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope_id UUID NULL REFERENCES automation_governance_scopes(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES user_profiles(id),
  target_type TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  note TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_gov_events_org ON automation_governance_events(organization_id, created_at DESC);
