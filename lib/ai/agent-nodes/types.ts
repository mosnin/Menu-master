// Agent archetypes
export type AgentArchetype = 'planner' | 'classifier' | 'recommender' | 'extractor' | 'critic' | 'router';

// Concrete agent node types (these get added to WorkflowNodeType)
export type AgentNodeType =
  | 'agent_next_best_action_planner'
  | 'agent_exception_triage_classifier'
  | 'agent_document_classifier'
  | 'agent_offer_explanation'
  | 'agent_communication_draft'
  | 'agent_compliance_critic'
  | 'agent_deal_router';

// Safety constraints for an agent node
export interface AgentSafetyConstraints {
  max_tokens: number;           // Output token limit
  max_retries: number;          // How many times to retry on failure
  timeout_ms: number;           // Per-invocation timeout
  allowed_tools: string[];      // Explicit tool whitelist (empty = no tool use)
  blocked_actions: string[];    // Actions this agent must never perform
  require_human_review: boolean; // Whether output requires human approval before acting
  max_cost_cents: number;       // Budget cap per invocation
  pii_scrub: boolean;           // Whether to scrub PII from outputs
}

// Agent node registration entry
export interface AgentNodeDefinition {
  type: AgentNodeType;
  archetype: AgentArchetype;
  label: string;
  description: string;
  system_prompt: string;
  safety: AgentSafetyConstraints;
  input_schema: Record<string, { type: string; required: boolean; description: string }>;
  output_schema: Record<string, { type: string; description: string }>;
}

// Result of executing an agent node
export interface AgentNodeResult {
  success: boolean;
  output: Record<string, unknown>;
  token_usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  latency_ms: number;
  retries_used: number;
  safety_flags: string[];       // Any safety concerns detected
  truncated: boolean;           // Whether output was truncated due to token limit
}

// Circuit breaker state
export interface CircuitBreakerState {
  agent_type: AgentNodeType;
  failure_count: number;
  last_failure_at: string | null;
  state: 'closed' | 'open' | 'half_open';
  cooldown_until: string | null;
}
