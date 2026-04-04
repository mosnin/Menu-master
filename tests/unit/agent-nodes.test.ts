import { describe, it, expect, beforeEach } from 'vitest';

// Side-effect import: registers all 7 agent node definitions
import '@/lib/ai/agent-nodes/definitions';

import {
  getAgentNodeDefinition,
  getAllAgentNodeDefinitions,
  isAgentNodeType,
  AGENT_NODE_TYPES,
} from '@/lib/ai/agent-nodes/registry';

import {
  DEFAULT_SAFETY,
  validateAgentOutput,
  estimateCostCents,
  getCircuitBreaker,
  recordSuccess,
  recordFailure,
  isCircuitOpen,
  resetCircuitBreaker,
} from '@/lib/ai/agent-nodes/safety';

import { VALID_NODE_TYPES } from '@/lib/services/workflow-graph-validator';

import type { WorkflowNodeType } from '@/types';
import type { AgentNodeResult, AgentNodeDefinition, AgentArchetype, FailureFallback, MemoryScope } from '@/lib/ai/agent-nodes/types';
import { applyScopeFilter } from '@/lib/ai/agent-nodes/safety';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides?: Partial<AgentNodeResult>): AgentNodeResult {
  return {
    success: true,
    output: { recommendation: 'proceed' },
    token_usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 },
    model: 'gpt-4o',
    latency_ms: 1200,
    retries_used: 0,
    confidence: null,
    safety_flags: [],
    truncated: false,
    fallback_used: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group 1: Agent Node Registry
// ---------------------------------------------------------------------------

describe('Agent Node Registry', () => {
  it('has all 7 agent types registered after importing definitions', () => {
    const defs = getAllAgentNodeDefinitions();
    expect(defs).toHaveLength(7);
  });

  it('isAgentNodeType returns true for valid agent types', () => {
    for (const t of AGENT_NODE_TYPES) {
      expect(isAgentNodeType(t)).toBe(true);
    }
  });

  it('isAgentNodeType returns false for non-agent types', () => {
    for (const t of ['start', 'stop', 'condition', 'branch', 'wait', 'loop', 'join', 'human_checkpoint']) {
      expect(isAgentNodeType(t)).toBe(false);
    }
  });

  it('getAgentNodeDefinition returns a definition for each registered type', () => {
    for (const t of AGENT_NODE_TYPES) {
      const def = getAgentNodeDefinition(t);
      expect(def).toBeDefined();
      expect(def!.type).toBe(t);
    }
  });

  it('getAgentNodeDefinition returns undefined for an unknown type', () => {
    const def = getAgentNodeDefinition('nonexistent_agent' as any);
    expect(def).toBeUndefined();
  });

  it('getAllAgentNodeDefinitions returns exactly 7 definitions', () => {
    expect(getAllAgentNodeDefinitions().length).toBe(7);
  });

  it('each definition has all required fields', () => {
    const requiredKeys: (keyof AgentNodeDefinition)[] = [
      'type',
      'archetype',
      'label',
      'description',
      'system_prompt',
      'safety',
      'input_schema',
      'output_schema',
    ];
    for (const def of getAllAgentNodeDefinitions()) {
      for (const key of requiredKeys) {
        expect(def).toHaveProperty(key);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Group 2: Safety Constraints
// ---------------------------------------------------------------------------

describe('Safety Constraints', () => {
  it('DEFAULT_SAFETY has conservative values', () => {
    expect(DEFAULT_SAFETY.require_human_review).toBe(true);
    expect(DEFAULT_SAFETY.max_tokens).toBeGreaterThan(0);
    expect(DEFAULT_SAFETY.max_retries).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SAFETY.max_steps).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_SAFETY.timeout_ms).toBeGreaterThan(0);
    expect(DEFAULT_SAFETY.max_cost_cents).toBeGreaterThan(0);
    expect(DEFAULT_SAFETY.confidence_threshold).toBeDefined();
    expect(DEFAULT_SAFETY.failure_fallback).toBe('escalate_to_human');
    expect(DEFAULT_SAFETY.memory_scope).toBe('workflow_context');
  });

  it('validateAgentOutput passes for clean output', () => {
    const result = makeResult();
    const { valid, violations } = validateAgentOutput(result, DEFAULT_SAFETY);
    expect(valid).toBe(true);
    expect(violations).toHaveLength(0);
  });

  it('validateAgentOutput catches token limit violations', () => {
    const result = makeResult({
      token_usage: { prompt_tokens: 100, completion_tokens: 5000, total_tokens: 5100 },
    });
    const { valid, violations } = validateAgentOutput(result, DEFAULT_SAFETY);
    expect(valid).toBe(false);
    expect(violations.some((v) => v.includes('Token limit exceeded'))).toBe(true);
  });

  it('validateAgentOutput catches blocked action references in output', () => {
    const result = makeResult({
      output: { action: 'delete_transaction', reason: 'test' },
    });
    const { valid, violations } = validateAgentOutput(result, DEFAULT_SAFETY);
    expect(valid).toBe(false);
    expect(violations.some((v) => v.includes('blocked action'))).toBe(true);
  });

  it('estimateCostCents returns a positive number for non-zero tokens', () => {
    const cost = estimateCostCents({ prompt_tokens: 1000, completion_tokens: 500 });
    expect(cost).toBeGreaterThan(0);
  });

  it('estimateCostCents returns 0 for zero tokens', () => {
    const cost = estimateCostCents({ prompt_tokens: 0, completion_tokens: 0 });
    expect(cost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 3: Circuit Breaker
// ---------------------------------------------------------------------------

describe('Circuit Breaker', () => {
  const AGENT = 'agent_deal_router' as const;

  beforeEach(() => {
    resetCircuitBreaker(AGENT);
  });

  it('initial state is closed', () => {
    const cb = getCircuitBreaker(AGENT);
    expect(cb.state).toBe('closed');
  });

  it('recordSuccess keeps state closed', () => {
    recordSuccess(AGENT);
    const cb = getCircuitBreaker(AGENT);
    expect(cb.state).toBe('closed');
    expect(cb.failure_count).toBe(0);
  });

  it('recordFailure increments failure count', () => {
    recordFailure(AGENT);
    const cb = getCircuitBreaker(AGENT);
    expect(cb.failure_count).toBe(1);
  });

  it('circuit opens after 5 failures (threshold)', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(AGENT);
    }
    const cb = getCircuitBreaker(AGENT);
    expect(cb.state).toBe('open');
  });

  it('isCircuitOpen returns true when circuit is open and within cooldown', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(AGENT);
    }
    expect(isCircuitOpen(AGENT)).toBe(true);
  });

  it('resetCircuitBreaker resets to initial state', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(AGENT);
    }
    resetCircuitBreaker(AGENT);
    const cb = getCircuitBreaker(AGENT);
    expect(cb.state).toBe('closed');
    expect(cb.failure_count).toBe(0);
  });

  it('circuit transitions to half_open after cooldown expires', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(AGENT);
    }
    // Manually set cooldown to the past to simulate expiry
    const cb = getCircuitBreaker(AGENT);
    cb.cooldown_until = new Date(Date.now() - 1000).toISOString();
    // isCircuitOpen should transition to half_open and return false
    expect(isCircuitOpen(AGENT)).toBe(false);
    expect(getCircuitBreaker(AGENT).state).toBe('half_open');
  });
});

// ---------------------------------------------------------------------------
// Group 4: Agent Node Definitions
// ---------------------------------------------------------------------------

describe('Agent Node Definitions', () => {
  const allDefs = getAllAgentNodeDefinitions();

  it('each archetype (planner, classifier, recommender, critic, router) is represented', () => {
    const archetypes = new Set(allDefs.map((d) => d.archetype));
    for (const a of ['planner', 'classifier', 'recommender', 'critic', 'router'] as AgentArchetype[]) {
      expect(archetypes.has(a)).toBe(true);
    }
  });

  it('all definitions have non-empty system prompts', () => {
    for (const def of allDefs) {
      expect(def.system_prompt.length).toBeGreaterThan(0);
    }
  });

  it('all definitions have safety constraints with positive max_tokens', () => {
    for (const def of allDefs) {
      expect(def.safety.max_tokens).toBeGreaterThan(0);
    }
  });

  it('compliance critic requires human review', () => {
    const critic = getAgentNodeDefinition('agent_compliance_critic')!;
    expect(critic.safety.require_human_review).toBe(true);
  });

  it('next best action planner requires human review', () => {
    const planner = getAgentNodeDefinition('agent_next_best_action_planner')!;
    expect(planner.safety.require_human_review).toBe(true);
  });

  it('deal router does NOT require human review', () => {
    const router = getAgentNodeDefinition('agent_deal_router')!;
    expect(router.safety.require_human_review).toBe(false);
  });

  it('all definitions have blocked_actions arrays', () => {
    for (const def of allDefs) {
      expect(Array.isArray(def.safety.blocked_actions)).toBe(true);
    }
  });

  it('no duplicate agent types in registry', () => {
    const types = allDefs.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

// ---------------------------------------------------------------------------
// Group 5: Type Integration
// ---------------------------------------------------------------------------

describe('Type Integration', () => {
  it('agent node types are included in WorkflowNodeType', () => {
    // TypeScript compile-time check: each AGENT_NODE_TYPES entry is assignable to WorkflowNodeType
    const _typeCheck: WorkflowNodeType[] = [...AGENT_NODE_TYPES];
    expect(_typeCheck).toHaveLength(7);
  });

  it('all agent types are present in VALID_NODE_TYPES set', () => {
    for (const t of AGENT_NODE_TYPES) {
      expect(VALID_NODE_TYPES.has(t)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Group 6: Confidence Threshold
// ---------------------------------------------------------------------------

describe('Confidence Threshold', () => {
  it('validateAgentOutput passes when confidence is above threshold', () => {
    const result = makeResult({ confidence: 0.9 });
    const safety = { ...DEFAULT_SAFETY, confidence_threshold: 0.5 };
    const { valid } = validateAgentOutput(result, safety);
    expect(valid).toBe(true);
  });

  it('validateAgentOutput fails when confidence is below threshold', () => {
    const result = makeResult({ confidence: 0.3 });
    const safety = { ...DEFAULT_SAFETY, confidence_threshold: 0.5 };
    const { valid, violations } = validateAgentOutput(result, safety);
    expect(valid).toBe(false);
    expect(violations.some((v) => v.includes('Confidence below threshold'))).toBe(true);
  });

  it('validateAgentOutput passes when threshold is 0 (accept all)', () => {
    const result = makeResult({ confidence: 0.1 });
    const safety = { ...DEFAULT_SAFETY, confidence_threshold: 0 };
    const { valid } = validateAgentOutput(result, safety);
    expect(valid).toBe(true);
  });

  it('validateAgentOutput passes when confidence is null (not reported)', () => {
    const result = makeResult({ confidence: null });
    const safety = { ...DEFAULT_SAFETY, confidence_threshold: 0.8 };
    const { valid } = validateAgentOutput(result, safety);
    expect(valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 7: Memory Scope
// ---------------------------------------------------------------------------

describe('Memory Scope', () => {
  const fullContext = {
    transaction: { id: 't1', type: 'sale' },
    transaction_id: 't1',
    listing: { id: 'l1', price: 500000 },
    listing_id: 'l1',
    other_data: 'should be filtered',
  };

  it('workflow_context returns full context', () => {
    const scoped = applyScopeFilter(fullContext, 'workflow_context');
    expect(Object.keys(scoped).length).toBe(Object.keys(fullContext).length);
  });

  it('step_local returns empty context', () => {
    const scoped = applyScopeFilter(fullContext, 'step_local');
    expect(Object.keys(scoped)).toHaveLength(0);
  });

  it('transaction_scoped returns only transaction keys', () => {
    const scoped = applyScopeFilter(fullContext, 'transaction_scoped');
    expect(scoped).toHaveProperty('transaction');
    expect(scoped).toHaveProperty('transaction_id');
    expect(scoped).not.toHaveProperty('listing');
    expect(scoped).not.toHaveProperty('other_data');
  });

  it('listing_scoped returns only listing keys', () => {
    const scoped = applyScopeFilter(fullContext, 'listing_scoped');
    expect(scoped).toHaveProperty('listing');
    expect(scoped).toHaveProperty('listing_id');
    expect(scoped).not.toHaveProperty('transaction');
    expect(scoped).not.toHaveProperty('other_data');
  });
});

// ---------------------------------------------------------------------------
// Group 8: Failure Fallback
// ---------------------------------------------------------------------------

describe('Failure Fallback', () => {
  it('all definitions have a valid failure_fallback strategy', () => {
    const validStrategies: FailureFallback[] = ['use_default_output', 'escalate_to_human', 'skip', 'abort_run'];
    for (const def of getAllAgentNodeDefinitions()) {
      expect(validStrategies).toContain(def.safety.failure_fallback);
    }
  });

  it('all definitions have a valid memory_scope', () => {
    const validScopes: MemoryScope[] = ['step_local', 'workflow_context', 'transaction_scoped', 'listing_scoped'];
    for (const def of getAllAgentNodeDefinitions()) {
      expect(validScopes).toContain(def.safety.memory_scope);
    }
  });

  it('all definitions have max_steps >= 1', () => {
    for (const def of getAllAgentNodeDefinitions()) {
      expect(def.safety.max_steps).toBeGreaterThanOrEqual(1);
    }
  });

  it('all definitions have confidence_threshold between 0 and 1', () => {
    for (const def of getAllAgentNodeDefinitions()) {
      expect(def.safety.confidence_threshold).toBeGreaterThanOrEqual(0);
      expect(def.safety.confidence_threshold).toBeLessThanOrEqual(1);
    }
  });

  it('document classifier uses step_local memory scope', () => {
    const def = getAgentNodeDefinition('agent_document_classifier')!;
    expect(def.safety.memory_scope).toBe('step_local');
  });

  it('exception triage uses transaction_scoped memory', () => {
    const def = getAgentNodeDefinition('agent_exception_triage_classifier')!;
    expect(def.safety.memory_scope).toBe('transaction_scoped');
  });

  it('offer explanation uses listing_scoped memory', () => {
    const def = getAgentNodeDefinition('agent_offer_explanation')!;
    expect(def.safety.memory_scope).toBe('listing_scoped');
  });
});
