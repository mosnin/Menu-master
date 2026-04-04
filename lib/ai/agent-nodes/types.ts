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

// Failure fallback strategy
export type FailureFallback =
  | 'use_default_output'      // Return predefined safe output
  | 'escalate_to_human'       // Mark step as waiting for human decision
  | 'skip'                    // Skip this node and continue downstream
  | 'abort_run';              // Abort the entire run

// Memory scope controls what context the agent can see
export type MemoryScope =
  | 'step_local'              // Only current step inputs
  | 'workflow_context'        // Full workflow context (default)
  | 'transaction_scoped'      // Only transaction entity data
  | 'listing_scoped';         // Only listing entity data

// Safety constraints for an agent node
export interface AgentSafetyConstraints {
  max_tokens: number;              // Output token limit
  max_retries: number;             // How many times to retry on failure
  max_steps: number;               // Max reasoning steps within an agent invocation
  timeout_ms: number;              // Per-invocation timeout
  allowed_tools: string[];         // Explicit tool whitelist (empty = no tool use)
  blocked_actions: string[];       // Actions this agent must never perform
  require_human_review: boolean;   // Whether output requires human approval before acting
  max_cost_cents: number;          // Budget cap per invocation
  confidence_threshold: number;    // Minimum confidence to accept output (0-1, 0 = accept all)
  failure_fallback: FailureFallback; // What to do when execution fails
  memory_scope: MemoryScope;       // What context the agent can access
  pii_scrub: boolean;              // Whether to scrub PII from outputs
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
  confidence: number | null;       // Extracted confidence score from output (if present)
  safety_flags: string[];          // Any safety concerns detected
  truncated: boolean;              // Whether output was truncated due to token limit
  fallback_used: FailureFallback | null; // Which fallback was triggered, if any
}

// Circuit breaker state
export interface CircuitBreakerState {
  agent_type: AgentNodeType;
  failure_count: number;
  last_failure_at: string | null;
  state: 'closed' | 'open' | 'half_open';
  cooldown_until: string | null;
}
