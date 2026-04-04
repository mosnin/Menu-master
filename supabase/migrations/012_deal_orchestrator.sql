-- =============================================================================
-- Migration 012: Deal Orchestrator Foundation
-- Persistent orchestrator, world state, memory, planning cycles, action engine
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Deal Orchestrators — one per active listing or transaction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deal_orchestrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'listing')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  risk_summary JSONB NOT NULL DEFAULT '{}',
  priority_summary JSONB NOT NULL DEFAULT '{}',
  last_observed_at TIMESTAMPTZ,
  last_planned_at TIMESTAMPTZ,
  last_executed_at TIMESTAMPTZ,
  last_human_escalation_at TIMESTAMPTZ,
  last_human_escalation_status TEXT CHECK (last_human_escalation_status IN ('pending', 'resolved', 'dismissed')),
  cycle_count INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orchestrators_entity ON deal_orchestrators(entity_type, entity_id);
CREATE INDEX idx_orchestrators_org ON deal_orchestrators(organization_id);
CREATE INDEX idx_orchestrators_status ON deal_orchestrators(status);
CREATE INDEX idx_orchestrators_priority ON deal_orchestrators(priority);
CREATE INDEX idx_orchestrators_last_observed ON deal_orchestrators(last_observed_at);

-- ---------------------------------------------------------------------------
-- 2. World State Snapshots — structured deal state at a point in time
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_world_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  state_hash TEXT NOT NULL,
  changed_since_last BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_states_orchestrator ON orchestrator_world_states(orchestrator_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Memory Entries — structured orchestrator memory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'blocker', 'action_taken', 'recommendation_given', 'recommendation_outcome',
    'failure_pattern', 'counterparty_signal', 'human_correction', 'pending_decision',
    'obligation', 'escalation'
  )),
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_orchestrator ON orchestrator_memory_entries(orchestrator_id, created_at DESC);
CREATE INDEX idx_memory_unresolved ON orchestrator_memory_entries(orchestrator_id, resolved) WHERE resolved = false;
CREATE INDEX idx_memory_type ON orchestrator_memory_entries(orchestrator_id, memory_type);

-- ---------------------------------------------------------------------------
-- 4. Orchestrator Cycles — each observe-plan-execute cycle
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'scheduled', 'document_uploaded', 'approval_changed', 'stage_changed',
    'communication_received', 'deadline_approaching', 'manual', 'entity_updated',
    'exception_detected', 'obligation_overdue'
  )),
  trigger_metadata JSONB NOT NULL DEFAULT '{}',
  world_state_id UUID REFERENCES orchestrator_world_states(id),
  planner_output JSONB,
  critic_evaluation JSONB,
  selected_actions JSONB,
  execution_summary JSONB,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_cycles_orchestrator ON orchestrator_cycles(orchestrator_id, created_at DESC);
CREATE INDEX idx_cycles_status ON orchestrator_cycles(status);

-- ---------------------------------------------------------------------------
-- 5. Action Proposals — what the planner wants to do
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES orchestrator_cycles(id) ON DELETE CASCADE,
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_params JSONB NOT NULL DEFAULT '{}',
  risk_class TEXT NOT NULL CHECK (risk_class IN ('safe', 'medium_risk', 'high_risk')),
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  critic_approved BOOLEAN,
  critic_notes TEXT,
  prerequisites JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'approved', 'rejected', 'executed', 'failed', 'gated', 'expired'
  )),
  gated_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_cycle ON orchestrator_action_proposals(cycle_id);
CREATE INDEX idx_proposals_orchestrator ON orchestrator_action_proposals(orchestrator_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Action Executions — what actually ran
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES orchestrator_action_proposals(id) ON DELETE CASCADE,
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_params JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  side_effects JSONB NOT NULL DEFAULT '[]',
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_executions_idempotency ON orchestrator_action_executions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_executions_orchestrator ON orchestrator_action_executions(orchestrator_id, created_at DESC);
CREATE INDEX idx_executions_proposal ON orchestrator_action_executions(proposal_id);

-- ---------------------------------------------------------------------------
-- 7. Next Actions — first-class orchestrator output for UI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_next_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  risk_class TEXT NOT NULL CHECK (risk_class IN ('safe', 'medium_risk', 'high_risk')),
  owner_user_id UUID REFERENCES user_profiles(id),
  owner_role TEXT,
  prerequisites JSONB NOT NULL DEFAULT '[]',
  source_signals JSONB NOT NULL DEFAULT '[]',
  auto_executable BOOLEAN NOT NULL DEFAULT false,
  tool_name TEXT,
  tool_params JSONB,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'resolved', 'dismissed')),
  stale_after TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  cycle_id UUID REFERENCES orchestrator_cycles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_next_actions_orchestrator ON orchestrator_next_actions(orchestrator_id, status);
CREATE INDEX idx_next_actions_active ON orchestrator_next_actions(orchestrator_id) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 8. Orchestrator Obligations — what's being waited on
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  obligation_type TEXT NOT NULL CHECK (obligation_type IN (
    'document_needed', 'signature_needed', 'approval_pending', 'response_waiting',
    'counterparty_action', 'deadline_approaching', 'review_required', 'manual_step'
  )),
  description TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('internal', 'counterparty', 'system')),
  owner_user_id UUID REFERENCES user_profiles(id),
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'overdue', 'cancelled')),
  fulfilled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obligations_orchestrator ON orchestrator_obligations(orchestrator_id, status);
CREATE INDEX idx_obligations_due ON orchestrator_obligations(due_at) WHERE status = 'open';
