import type { AgentSafetyConstraints, AgentNodeResult, CircuitBreakerState, AgentNodeType } from './types';
import { logger } from '@/lib/logger';

// Default safety constraints (conservative defaults)
export const DEFAULT_SAFETY: AgentSafetyConstraints = {
  max_tokens: 2048,
  max_retries: 2,
  max_steps: 1,
  timeout_ms: 30000,
  allowed_tools: [],
  blocked_actions: ['delete_transaction', 'delete_listing', 'send_email', 'transfer_funds'],
  require_human_review: true,
  max_cost_cents: 10,
  confidence_threshold: 0,
  failure_fallback: 'escalate_to_human',
  memory_scope: 'workflow_context',
  pii_scrub: false,
};

// Circuit breaker implementation
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60000; // 1 minute

const circuitBreakers = new Map<string, CircuitBreakerState>();

export function getCircuitBreaker(agentType: AgentNodeType): CircuitBreakerState {
  if (!circuitBreakers.has(agentType)) {
    circuitBreakers.set(agentType, {
      agent_type: agentType,
      failure_count: 0,
      last_failure_at: null,
      state: 'closed',
      cooldown_until: null,
    });
  }
  return circuitBreakers.get(agentType)!;
}

export function recordSuccess(agentType: AgentNodeType): void {
  const cb = getCircuitBreaker(agentType);
  cb.failure_count = 0;
  cb.state = 'closed';
  cb.cooldown_until = null;
}

export function recordFailure(agentType: AgentNodeType): void {
  const cb = getCircuitBreaker(agentType);
  cb.failure_count += 1;
  cb.last_failure_at = new Date().toISOString();

  if (cb.failure_count >= FAILURE_THRESHOLD) {
    cb.state = 'open';
    cb.cooldown_until = new Date(Date.now() + COOLDOWN_MS).toISOString();
    logger.warn('Circuit breaker opened for agent', { agentType, failures: cb.failure_count });
  }
}

export function isCircuitOpen(agentType: AgentNodeType): boolean {
  const cb = getCircuitBreaker(agentType);
  if (cb.state === 'closed') return false;
  if (cb.state === 'open' && cb.cooldown_until) {
    if (new Date() > new Date(cb.cooldown_until)) {
      cb.state = 'half_open';
      return false; // Allow one attempt
    }
    return true;
  }
  return false;
}

export function resetCircuitBreaker(agentType: AgentNodeType): void {
  circuitBreakers.delete(agentType);
}

// Validate that result respects safety constraints
export function validateAgentOutput(
  result: AgentNodeResult,
  safety: AgentSafetyConstraints,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (result.token_usage.completion_tokens > safety.max_tokens) {
    violations.push(`Token limit exceeded: ${result.token_usage.completion_tokens} > ${safety.max_tokens}`);
  }

  // Check confidence threshold
  if (safety.confidence_threshold > 0 && result.confidence !== null) {
    if (result.confidence < safety.confidence_threshold) {
      violations.push(`Confidence below threshold: ${result.confidence} < ${safety.confidence_threshold}`);
    }
  }

  // Check for blocked action references in output
  const outputStr = JSON.stringify(result.output).toLowerCase();
  for (const blocked of safety.blocked_actions) {
    if (outputStr.includes(blocked.toLowerCase())) {
      violations.push(`Output references blocked action: ${blocked}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

// Apply memory scope filtering to context
export function applyScopeFilter(
  context: Record<string, unknown>,
  scope: AgentSafetyConstraints['memory_scope'],
): Record<string, unknown> {
  switch (scope) {
    case 'step_local':
      return {};
    case 'transaction_scoped':
      return pickKeys(context, ['transaction', 'transaction_id', 'transaction_summary', 'transaction_data', 'transaction_type']);
    case 'listing_scoped':
      return pickKeys(context, ['listing', 'listing_id', 'listing_details', 'listing_summary', 'listing_stage']);
    case 'workflow_context':
    default:
      return context;
  }
}

function pickKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

// Estimate cost in cents based on token usage (GPT-4o pricing approximation)
export function estimateCostCents(tokenUsage: { prompt_tokens: number; completion_tokens: number }): number {
  // Approximate GPT-4o pricing: $2.50/1M input, $10/1M output
  const inputCost = (tokenUsage.prompt_tokens / 1_000_000) * 250;
  const outputCost = (tokenUsage.completion_tokens / 1_000_000) * 1000;
  return Math.ceil(inputCost + outputCost);
}
