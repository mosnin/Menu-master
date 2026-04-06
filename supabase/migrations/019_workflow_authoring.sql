-- =============================================================================
-- Migration 019: Natural Language Workflow Authoring Sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_authoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  prompt_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'accepted', 'discarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_authoring_sessions_org ON workflow_authoring_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_authoring_sessions_user ON workflow_authoring_sessions(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_authoring_sessions_created_at ON workflow_authoring_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_authoring_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workflow_authoring_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  intent_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_authoring_intents_session ON workflow_authoring_intents(session_id);
CREATE INDEX IF NOT EXISTS idx_workflow_authoring_intents_org ON workflow_authoring_intents(organization_id);

CREATE TABLE IF NOT EXISTS workflow_generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workflow_authoring_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  prompt_text TEXT NOT NULL,
  draft_graph_json JSONB NOT NULL,
  assumptions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_information_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_generation_attempts_session ON workflow_generation_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_workflow_generation_attempts_org ON workflow_generation_attempts(organization_id);

CREATE TABLE IF NOT EXISTS workflow_generation_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_attempt_id UUID NOT NULL REFERENCES workflow_generation_attempts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assumption_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_generation_assumptions_attempt ON workflow_generation_assumptions(generation_attempt_id);

CREATE TABLE IF NOT EXISTS workflow_generation_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_attempt_id UUID NOT NULL REFERENCES workflow_generation_attempts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warning_code TEXT NOT NULL,
  warning_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_generation_warnings_attempt ON workflow_generation_warnings(generation_attempt_id);

CREATE TABLE IF NOT EXISTS workflow_generation_repair_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_attempt_id UUID NOT NULL REFERENCES workflow_generation_attempts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repair_prompt TEXT NOT NULL,
  repair_result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_generation_repair_attempts_attempt ON workflow_generation_repair_attempts(generation_attempt_id);
