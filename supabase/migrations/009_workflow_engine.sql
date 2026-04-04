-- =============================================================================
-- Migration 009: Workflow Engine
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Workflows: top-level workflow definition
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_created_by ON workflows(created_by_user_id);
CREATE INDEX idx_workflows_active ON workflows(is_active);

-- -----------------------------------------------------------------------------
-- Workflow versions: immutable snapshots of a workflow graph
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validating', 'validated', 'published', 'archived')),
  graph_data JSONB NOT NULL,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  published_by_user_id UUID REFERENCES user_profiles(id),
  published_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version_number)
);

CREATE INDEX idx_workflow_versions_workflow ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_status ON workflow_versions(status);

-- -----------------------------------------------------------------------------
-- Workflow triggers: event bindings that start a workflow run
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'transaction_created', 'document_uploaded', 'approval_decided',
      'stage_changed', 'exception_created', 'listing_created',
      'offer_accepted', 'scheduled_trigger', 'manual_trigger'
    )),
  event_filter JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_triggers_version ON workflow_triggers(workflow_version_id);
CREATE INDEX idx_workflow_triggers_event_type ON workflow_triggers(event_type);
CREATE INDEX idx_workflow_triggers_active ON workflow_triggers(is_active);

-- -----------------------------------------------------------------------------
-- Workflow runs: individual execution of a workflow version
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'running', 'waiting', 'completed',
      'failed', 'cancelled', 'timed_out'
    )),
  trigger_event_type TEXT,
  trigger_payload JSONB DEFAULT '{}'::jsonb,
  context_data JSONB DEFAULT '{}'::jsonb,
  current_node_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  entity_type TEXT,
  entity_id UUID,
  initiated_by_user_id UUID REFERENCES user_profiles(id),
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_version ON workflow_runs(workflow_version_id);
CREATE INDEX idx_workflow_runs_org ON workflow_runs(organization_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_entity ON workflow_runs(entity_type, entity_id);
CREATE INDEX idx_workflow_runs_initiated_by ON workflow_runs(initiated_by_user_id);

-- -----------------------------------------------------------------------------
-- Workflow run steps: individual node executions within a run
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_label TEXT,
  step_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'running', 'completed', 'failed', 'skipped', 'waiting'
    )),
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_run_steps_run ON workflow_run_steps(run_id);
CREATE INDEX idx_workflow_run_steps_status ON workflow_run_steps(status);
CREATE INDEX idx_workflow_run_steps_node ON workflow_run_steps(node_id);
