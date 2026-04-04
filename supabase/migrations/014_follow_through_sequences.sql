-- Follow-Through Sequences: bounded multi-step autonomous sequences
-- for the orchestrator to execute with inspectability and cancellation support.

CREATE TABLE IF NOT EXISTS orchestrator_follow_through_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id),
  sequence_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'failed', 'waiting')),
  current_step INTEGER NOT NULL DEFAULT 1,
  trigger_data JSONB DEFAULT '{}',
  step_results JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT now(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_follow_through_orchestrator ON orchestrator_follow_through_runs(orchestrator_id);
CREATE INDEX idx_follow_through_status ON orchestrator_follow_through_runs(status) WHERE status IN ('active', 'waiting');
