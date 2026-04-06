-- =============================================================================
-- Migration 020: Unified Automation Trace Events
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_trace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL CHECK (source_system IN ('workflow', 'orchestrator', 'agent_node')),
  status TEXT NOT NULL CHECK (status IN ('proposed', 'auto_execute', 'create_draft', 'create_approval', 'block', 'executed', 'failed', 'escalate')),
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  workflow_run_step_id UUID REFERENCES workflow_run_steps(id) ON DELETE SET NULL,
  orchestrator_id UUID REFERENCES deal_orchestrators(id) ON DELETE SET NULL,
  orchestrator_cycle_id UUID REFERENCES orchestrator_cycles(id) ON DELETE SET NULL,
  orchestrator_proposal_id UUID REFERENCES orchestrator_action_proposals(id) ON DELETE SET NULL,
  orchestrator_execution_id UUID REFERENCES orchestrator_action_executions(id) ON DELETE SET NULL,
  tool_name TEXT,
  tool_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_disposition TEXT,
  policy_rule TEXT,
  policy_reason TEXT,
  outcome_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_trace_org_created ON automation_trace_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_trace_workflow_run ON automation_trace_events(workflow_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_trace_orchestrator ON automation_trace_events(orchestrator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_trace_tool ON automation_trace_events(tool_name, created_at DESC);
