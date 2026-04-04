CREATE TABLE IF NOT EXISTS orchestrator_specialist_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES orchestrator_cycles(id) ON DELETE CASCADE,
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  specialist_role TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  operator_summary TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_specialist_traces_cycle ON orchestrator_specialist_traces(cycle_id);
CREATE INDEX idx_specialist_traces_orchestrator ON orchestrator_specialist_traces(orchestrator_id);
