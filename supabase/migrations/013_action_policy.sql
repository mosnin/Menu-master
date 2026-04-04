CREATE TABLE IF NOT EXISTS orchestrator_action_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  policy_name TEXT NOT NULL,
  promoted_to_safe TEXT[] DEFAULT '{}',
  demoted_to_blocked TEXT[] DEFAULT '{}',
  require_approval_for TEXT[] DEFAULT '{}',
  custom_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, policy_name)
);

CREATE INDEX idx_action_policies_org ON orchestrator_action_policies(organization_id);
