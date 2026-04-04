-- =============================================================================
-- Migration 015: Orchestrator Plans
-- Persistent plan model for multi-cycle planning
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Orchestrator Plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'listing')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'waiting', 'blocked', 'completed', 'cancelled', 'superseded')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  priority_rationale TEXT,
  review_cadence_hours INTEGER DEFAULT 24,
  refresh_conditions JSONB DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  superseded_by UUID REFERENCES orchestrator_plans(id),
  blocked_reason TEXT,
  blocked_since TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plans_orchestrator ON orchestrator_plans(orchestrator_id);
CREATE INDEX idx_plans_status ON orchestrator_plans(status) WHERE status IN ('draft', 'active', 'waiting', 'blocked');
CREATE INDEX idx_plans_org ON orchestrator_plans(organization_id);

-- Only one active/draft/waiting/blocked plan per orchestrator
CREATE UNIQUE INDEX idx_plans_one_active ON orchestrator_plans(orchestrator_id)
  WHERE status IN ('active', 'draft', 'waiting', 'blocked');

-- ---------------------------------------------------------------------------
-- 2. Orchestrator Subgoals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_subgoals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES orchestrator_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting', 'blocked', 'completed', 'skipped')),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  owner_user_id UUID,
  owner_role TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  prerequisites TEXT[] DEFAULT '{}',
  completion_condition TEXT NOT NULL,
  blocked_reason TEXT,
  blocked_since TIMESTAMPTZ,
  linked_action_ids UUID[] DEFAULT '{}',
  linked_tool_names TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subgoals_plan ON orchestrator_subgoals(plan_id);
CREATE INDEX idx_subgoals_status ON orchestrator_subgoals(status) WHERE status IN ('pending', 'in_progress', 'waiting', 'blocked');

-- ---------------------------------------------------------------------------
-- 3. Plan Revision History
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orchestrator_plan_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES orchestrator_plans(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  reason TEXT NOT NULL,
  changes_summary TEXT NOT NULL,
  previous_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_revisions_plan ON orchestrator_plan_revisions(plan_id);
