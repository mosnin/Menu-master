-- =============================================================================
-- Migration 018: Adaptive Planning Enhancements
-- Waiting state semantics, subgoal dependencies, plan context enrichment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add waiting state semantics to subgoals
-- ---------------------------------------------------------------------------
ALTER TABLE orchestrator_subgoals
  ADD COLUMN IF NOT EXISTS waiting_on_type TEXT CHECK (waiting_on_type IN (
    'seller', 'buyer', 'lender', 'title', 'appraiser', 'inspector',
    'approval', 'document_upload', 'compliance_review', 'counterparty', 'internal'
  )),
  ADD COLUMN IF NOT EXISTS waiting_on_detail TEXT,
  ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waiting_expected_event TEXT,
  ADD COLUMN IF NOT EXISTS waiting_escalation_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS depends_on_subgoal_ids UUID[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. Add plan-level context fields
-- ---------------------------------------------------------------------------
ALTER TABLE orchestrator_plans
  ADD COLUMN IF NOT EXISTS risk_summary TEXT,
  ADD COLUMN IF NOT EXISTS source_signals JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS replan_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_replan_reason TEXT,
  ADD COLUMN IF NOT EXISTS world_state_hash TEXT;

-- ---------------------------------------------------------------------------
-- 3. Indexes for waiting state queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subgoals_waiting
  ON orchestrator_subgoals(waiting_on_type)
  WHERE status = 'waiting' AND waiting_on_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subgoals_escalation
  ON orchestrator_subgoals(waiting_since)
  WHERE status = 'waiting' AND waiting_since IS NOT NULL;
