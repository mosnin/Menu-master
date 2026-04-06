-- Migration 017: Learning and Adaptation Layer
-- Adds outcome tracking, action effectiveness scoring, recommendation feedback,
-- correction patterns, counterparty behavior learning, specialist scoring,
-- org adaptation profiles, and memory summaries.

-- =============================================================================
-- 1. Outcome Tracking
-- =============================================================================
CREATE TABLE orchestrator_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id),
  cycle_id UUID REFERENCES orchestrator_cycles(id),
  proposal_id UUID REFERENCES orchestrator_action_proposals(id),
  execution_id UUID REFERENCES orchestrator_action_executions(id),
  plan_id UUID REFERENCES orchestrator_plans(id),
  specialist_trace_id UUID REFERENCES orchestrator_specialist_traces(id),

  -- What happened
  outcome_type TEXT NOT NULL CHECK (outcome_type IN (
    'blocker_resolved', 'deadline_protected', 'document_received',
    'approval_completed', 'response_received', 'readiness_improved',
    'plan_progressed', 'no_meaningful_effect', 'negative_effect'
  )),
  outcome_detail TEXT,

  -- Context snapshot (lightweight, no sensitive payloads)
  context_entity_type TEXT NOT NULL,
  context_entity_id UUID NOT NULL,
  context_stage TEXT,
  context_completeness_score NUMERIC,

  -- Timing
  action_at TIMESTAMPTZ,
  outcome_measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latency_hours NUMERIC,

  -- Scoring
  impact_score NUMERIC DEFAULT 0 CHECK (impact_score BETWEEN -1 AND 1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outcomes_org ON orchestrator_outcomes(organization_id);
CREATE INDEX idx_outcomes_orchestrator ON orchestrator_outcomes(orchestrator_id);
CREATE INDEX idx_outcomes_type ON orchestrator_outcomes(outcome_type);
CREATE INDEX idx_outcomes_proposal ON orchestrator_outcomes(proposal_id);
CREATE INDEX idx_outcomes_execution ON orchestrator_outcomes(execution_id);
CREATE INDEX idx_outcomes_measured ON orchestrator_outcomes(outcome_measured_at);

-- =============================================================================
-- 2. Action Effectiveness Scores (aggregated)
-- =============================================================================
CREATE TABLE orchestrator_action_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tool_name TEXT NOT NULL,

  -- Context dimensions
  entity_type TEXT,
  stage TEXT,
  blocker_type TEXT,
  counterparty_type TEXT,

  -- Aggregated scores
  total_executions INTEGER NOT NULL DEFAULT 0,
  successful_outcomes INTEGER NOT NULL DEFAULT 0,
  no_effect_outcomes INTEGER NOT NULL DEFAULT 0,
  negative_outcomes INTEGER NOT NULL DEFAULT 0,
  effectiveness_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (effectiveness_score BETWEEN 0 AND 1),

  -- Decay and freshness
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_window_days INTEGER NOT NULL DEFAULT 90,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, tool_name, entity_type, stage, blocker_type, counterparty_type)
);

CREATE INDEX idx_action_scores_org ON orchestrator_action_scores(organization_id);
CREATE INDEX idx_action_scores_tool ON orchestrator_action_scores(tool_name);
CREATE INDEX idx_action_scores_effectiveness ON orchestrator_action_scores(effectiveness_score);

-- =============================================================================
-- 3. Recommendation Feedback
-- =============================================================================
CREATE TABLE orchestrator_recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id),
  proposal_id UUID REFERENCES orchestrator_action_proposals(id),
  next_action_id UUID REFERENCES orchestrator_next_actions(id),

  tool_name TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,

  -- Human response
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'accepted', 'ignored', 'dismissed', 'superseded', 'edited'
  )),
  edit_summary TEXT,

  -- Context
  entity_type TEXT,
  stage TEXT,
  time_to_response_hours NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rec_feedback_org ON orchestrator_recommendation_feedback(organization_id);
CREATE INDEX idx_rec_feedback_tool ON orchestrator_recommendation_feedback(tool_name);
CREATE INDEX idx_rec_feedback_type ON orchestrator_recommendation_feedback(feedback_type);
CREATE INDEX idx_rec_feedback_orchestrator ON orchestrator_recommendation_feedback(orchestrator_id);

-- =============================================================================
-- 4. Correction Patterns
-- =============================================================================
CREATE TABLE orchestrator_correction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- What was corrected
  correction_category TEXT NOT NULL CHECK (correction_category IN (
    'extraction_field', 'checklist_item', 'timeline_date', 'document_type',
    'contact_info', 'compliance_flag', 'approval_routing', 'risk_classification',
    'urgency_assessment', 'specialist_routing', 'other'
  )),
  correction_detail TEXT NOT NULL,

  -- Pattern
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  entity_type TEXT,
  stage TEXT,
  document_type TEXT,

  -- Learned response
  suggested_action TEXT NOT NULL CHECK (suggested_action IN (
    'lower_confidence', 'request_manual_review', 'add_specialist_review',
    'flag_for_attention', 'adjust_gating', 'none'
  )),
  confidence_adjustment NUMERIC DEFAULT 0 CHECK (confidence_adjustment BETWEEN -0.5 AND 0),

  -- Lifecycle
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_occurrence_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correction_patterns_org ON orchestrator_correction_patterns(organization_id);
CREATE INDEX idx_correction_patterns_category ON orchestrator_correction_patterns(correction_category);
CREATE INDEX idx_correction_patterns_active ON orchestrator_correction_patterns(is_active) WHERE is_active = true;

-- =============================================================================
-- 5. Counterparty Behavior Signals
-- =============================================================================
CREATE TABLE orchestrator_counterparty_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id),

  -- Who
  counterparty_type TEXT NOT NULL CHECK (counterparty_type IN (
    'seller', 'buyer', 'lender', 'title', 'escrow', 'attorney',
    'inspector', 'appraiser', 'other'
  )),
  counterparty_id UUID,

  -- Behavior
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'response_time', 'missed_deadline', 'early_response',
    'document_quality', 'requires_follow_up', 'escalation_needed'
  )),

  -- Measurement
  expected_hours NUMERIC,
  actual_hours NUMERIC,
  deviation_hours NUMERIC,

  -- Context
  entity_type TEXT,
  stage TEXT,
  obligation_type TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_counterparty_signals_org ON orchestrator_counterparty_signals(organization_id);
CREATE INDEX idx_counterparty_signals_type ON orchestrator_counterparty_signals(counterparty_type);
CREATE INDEX idx_counterparty_signals_signal ON orchestrator_counterparty_signals(signal_type);
CREATE INDEX idx_counterparty_signals_orchestrator ON orchestrator_counterparty_signals(orchestrator_id);

-- Aggregated counterparty behavior profiles
CREATE TABLE orchestrator_counterparty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  counterparty_type TEXT NOT NULL,
  counterparty_id UUID,

  -- Aggregated behavior
  avg_response_hours NUMERIC,
  median_response_hours NUMERIC,
  p90_response_hours NUMERIC,
  missed_deadline_rate NUMERIC DEFAULT 0 CHECK (missed_deadline_rate BETWEEN 0 AND 1),
  follow_up_effectiveness NUMERIC DEFAULT 0.5 CHECK (follow_up_effectiveness BETWEEN 0 AND 1),
  total_interactions INTEGER NOT NULL DEFAULT 0,
  total_on_time INTEGER NOT NULL DEFAULT 0,
  total_late INTEGER NOT NULL DEFAULT 0,

  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, counterparty_type, counterparty_id)
);

CREATE INDEX idx_counterparty_profiles_org ON orchestrator_counterparty_profiles(organization_id);

-- =============================================================================
-- 6. Specialist Contribution Scores
-- =============================================================================
CREATE TABLE orchestrator_specialist_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  specialist_role TEXT NOT NULL,

  -- Context dimensions
  entity_type TEXT,
  stage TEXT,
  trigger_type TEXT,

  -- Scores
  total_invocations INTEGER NOT NULL DEFAULT 0,
  useful_invocations INTEGER NOT NULL DEFAULT 0,
  findings_led_to_action INTEGER NOT NULL DEFAULT 0,
  findings_improved_outcome INTEGER NOT NULL DEFAULT 0,
  unnecessary_invocations INTEGER NOT NULL DEFAULT 0,
  usefulness_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (usefulness_score BETWEEN 0 AND 1),

  -- Routing adjustment
  priority_adjustment INTEGER NOT NULL DEFAULT 0 CHECK (priority_adjustment BETWEEN -3 AND 3),

  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, specialist_role, entity_type, stage, trigger_type)
);

CREATE INDEX idx_specialist_scores_org ON orchestrator_specialist_scores(organization_id);
CREATE INDEX idx_specialist_scores_role ON orchestrator_specialist_scores(specialist_role);
CREATE INDEX idx_specialist_scores_usefulness ON orchestrator_specialist_scores(usefulness_score);

-- =============================================================================
-- 7. Organization Adaptation Profiles
-- =============================================================================
CREATE TABLE orchestrator_org_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,

  -- Learned preferences
  preferred_escalation_timing TEXT DEFAULT 'normal' CHECK (preferred_escalation_timing IN ('fast', 'normal', 'slow')),
  common_blocker_types TEXT[] DEFAULT '{}',
  commonly_ignored_actions TEXT[] DEFAULT '{}',
  strict_manual_review BOOLEAN DEFAULT false,
  compliance_sensitivity TEXT DEFAULT 'normal' CHECK (compliance_sensitivity IN ('low', 'normal', 'high')),

  -- Tuning signals
  confidence_threshold_adjustment NUMERIC DEFAULT 0 CHECK (confidence_threshold_adjustment BETWEEN -0.2 AND 0.2),
  urgency_bias TEXT DEFAULT 'neutral' CHECK (urgency_bias IN ('conservative', 'neutral', 'aggressive')),
  specialist_routing_sensitivity TEXT DEFAULT 'normal' CHECK (specialist_routing_sensitivity IN ('low', 'normal', 'high')),

  -- Resolution patterns
  common_successful_patterns JSONB DEFAULT '[]',
  common_failure_patterns JSONB DEFAULT '[]',

  -- Stats
  total_cycles_analyzed INTEGER NOT NULL DEFAULT 0,
  last_profile_update_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_profiles_org ON orchestrator_org_profiles(organization_id);

-- =============================================================================
-- 8. Memory Summaries (compacted memory)
-- =============================================================================
CREATE TABLE orchestrator_memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  orchestrator_id UUID NOT NULL REFERENCES deal_orchestrators(id),

  -- Summary type
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'action_pattern', 'blocker_pattern', 'recovery_pattern',
    'counterparty_pattern', 'correction_pattern', 'ignored_action_pattern',
    'successful_resolution'
  )),

  -- Content
  summary TEXT NOT NULL,
  pattern_count INTEGER NOT NULL DEFAULT 1,
  source_memory_ids UUID[] DEFAULT '{}',

  -- Relevance
  relevance_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (relevance_score BETWEEN 0 AND 1),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Window
  covers_from TIMESTAMPTZ,
  covers_to TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_summaries_org ON orchestrator_memory_summaries(organization_id);
CREATE INDEX idx_memory_summaries_orchestrator ON orchestrator_memory_summaries(orchestrator_id);
CREATE INDEX idx_memory_summaries_type ON orchestrator_memory_summaries(summary_type);
CREATE INDEX idx_memory_summaries_active ON orchestrator_memory_summaries(is_active) WHERE is_active = true;

-- =============================================================================
-- 9. Learning Audit Log
-- =============================================================================
CREATE TABLE orchestrator_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  orchestrator_id UUID REFERENCES deal_orchestrators(id),

  event_type TEXT NOT NULL CHECK (event_type IN (
    'outcome_recorded', 'score_updated', 'feedback_recorded',
    'correction_learned', 'counterparty_signal', 'specialist_scored',
    'profile_updated', 'memory_compacted', 'learning_influenced_plan',
    'learning_influenced_routing', 'learning_influenced_priority'
  )),

  -- Details
  detail JSONB NOT NULL DEFAULT '{}',
  influenced_entity TEXT,
  influenced_entity_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_events_org ON orchestrator_learning_events(organization_id);
CREATE INDEX idx_learning_events_type ON orchestrator_learning_events(event_type);
CREATE INDEX idx_learning_events_created ON orchestrator_learning_events(created_at);
