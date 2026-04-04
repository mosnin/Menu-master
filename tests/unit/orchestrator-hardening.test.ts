import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Hardening Tests — expanded coverage for safety, auth,
// idempotency, memory, deduplication, and pipeline integration.
// Pure unit tests; no DB calls.
// ---------------------------------------------------------------------------

// ===================================================================
// 1. Critic Gating — Expanded Rules
// ===================================================================
describe('Critic Gating — Expanded Rules', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';
  type UserRole = 'agent' | 'coordinator' | 'broker_admin';

  interface ProposedAction {
    tool_name: string;
    risk_class: RiskClass;
    confidence: number;
  }

  interface WorldState {
    stage: string;
    missing_docs: string[];
    compliance_flags: string[];
  }

  const TOOL_CONTRACTS: Record<string, { risk_class: RiskClass; required_role: UserRole }> = {
    recompute_completeness: { risk_class: 'safe', required_role: 'agent' },
    create_notification: { risk_class: 'safe', required_role: 'agent' },
    assign_owner: { risk_class: 'medium_risk', required_role: 'coordinator' },
    suggest_stage_transition: { risk_class: 'high_risk', required_role: 'broker_admin' },
  };

  const ROLE_HIERARCHY: Record<string, number> = { agent: 1, coordinator: 2, broker_admin: 3 };

  function applyDeterministicRules(
    action: ProposedAction,
    worldState: WorldState,
    actorRole: UserRole = 'agent',
  ): {
    approved: boolean;
    concerns: string[];
    requires_human_review: boolean;
  } {
    const concerns: string[] = [];
    let approved = true;
    let requiresHumanReview = false;

    const contract = TOOL_CONTRACTS[action.tool_name];

    // Rule 1: high_risk always requires human review
    if (action.risk_class === 'high_risk') {
      requiresHumanReview = true;
      concerns.push('High-risk action requires human review');
    }

    // Rule 2: medium_risk + low confidence requires human review
    if (action.risk_class === 'medium_risk' && action.confidence < 0.7) {
      requiresHumanReview = true;
      concerns.push('Medium-risk with low confidence');
    }

    // Rule 3: closed/cancelled deals are blocked
    if (worldState.stage === 'closed' || worldState.stage === 'cancelled') {
      approved = false;
      concerns.push(`Cannot execute on ${worldState.stage} deals`);
    }

    // Rule 4: stage transitions with missing docs
    if (action.tool_name === 'suggest_stage_transition' && worldState.missing_docs.length > 0) {
      requiresHumanReview = true;
      concerns.push('Stage transition with missing docs');
    }

    // Rule 5: risk class mismatch
    if (contract && contract.risk_class !== action.risk_class) {
      concerns.push(`Risk class mismatch: claimed ${action.risk_class}, registered ${contract.risk_class}`);
    }

    // Rule 6: compliance flags escalate non-safe
    if (worldState.compliance_flags.length > 0 && action.risk_class !== 'safe') {
      requiresHumanReview = true;
      concerns.push('Active compliance flags');
    }

    // Rule 7: unknown tools are rejected
    if (!contract) {
      approved = false;
      concerns.push(`Unknown tool: ${action.tool_name}`);
    }

    // Rule 8: role permission check
    if (contract) {
      const actorLevel = ROLE_HIERARCHY[actorRole] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[contract.required_role] ?? 999;
      if (actorLevel < requiredLevel) {
        approved = false;
        concerns.push(`Insufficient role: ${actorRole} cannot use ${action.tool_name} (requires ${contract.required_role})`);
      }
    }

    return { approved, concerns, requires_human_review: requiresHumanReview };
  }

  it('rejects unknown tools', () => {
    const result = applyDeterministicRules(
      { tool_name: 'nonexistent_tool', risk_class: 'safe', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
    );
    expect(result.approved).toBe(false);
    expect(result.concerns).toContain('Unknown tool: nonexistent_tool');
  });

  it('flags risk class mismatch between planner and registry', () => {
    const result = applyDeterministicRules(
      { tool_name: 'assign_owner', risk_class: 'safe', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
      'coordinator',
    );
    expect(result.concerns.some(c => c.includes('Risk class mismatch'))).toBe(true);
  });

  it('requires human review for medium_risk with low confidence', () => {
    const result = applyDeterministicRules(
      { tool_name: 'assign_owner', risk_class: 'medium_risk', confidence: 0.5 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
      'coordinator',
    );
    expect(result.requires_human_review).toBe(true);
  });

  it('blocks actions on closed deals', () => {
    const result = applyDeterministicRules(
      { tool_name: 'recompute_completeness', risk_class: 'safe', confidence: 0.95 },
      { stage: 'closed', missing_docs: [], compliance_flags: [] },
    );
    expect(result.approved).toBe(false);
  });

  it('blocks actions on cancelled deals', () => {
    const result = applyDeterministicRules(
      { tool_name: 'create_notification', risk_class: 'safe', confidence: 0.9 },
      { stage: 'cancelled', missing_docs: [], compliance_flags: [] },
    );
    expect(result.approved).toBe(false);
  });

  it('compliance flags escalate medium_risk to require human review', () => {
    const result = applyDeterministicRules(
      { tool_name: 'assign_owner', risk_class: 'medium_risk', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: ['missing_disclosure'] },
      'coordinator',
    );
    expect(result.requires_human_review).toBe(true);
  });

  it('compliance flags do not escalate safe actions', () => {
    const result = applyDeterministicRules(
      { tool_name: 'recompute_completeness', risk_class: 'safe', confidence: 0.95 },
      { stage: 'active', missing_docs: [], compliance_flags: ['missing_disclosure'] },
    );
    expect(result.requires_human_review).toBe(false);
  });

  it('deterministic rejection is never overridden by high confidence', () => {
    const result = applyDeterministicRules(
      { tool_name: 'recompute_completeness', risk_class: 'safe', confidence: 1.0 },
      { stage: 'closed', missing_docs: [], compliance_flags: [] },
    );
    expect(result.approved).toBe(false);
  });

  it('rejects agent using coordinator-only tool (Rule 8)', () => {
    const result = applyDeterministicRules(
      { tool_name: 'assign_owner', risk_class: 'medium_risk', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
      'agent',
    );
    expect(result.approved).toBe(false);
    expect(result.concerns.some(c => c.includes('Insufficient role'))).toBe(true);
  });

  it('allows coordinator to use coordinator-level tools', () => {
    const result = applyDeterministicRules(
      { tool_name: 'assign_owner', risk_class: 'medium_risk', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
      'coordinator',
    );
    expect(result.approved).toBe(true);
  });

  it('allows broker_admin to use all tools', () => {
    const result = applyDeterministicRules(
      { tool_name: 'suggest_stage_transition', risk_class: 'high_risk', confidence: 0.9 },
      { stage: 'active', missing_docs: [], compliance_flags: [] },
      'broker_admin',
    );
    // approved but requires human review due to high_risk
    expect(result.approved).toBe(true);
    expect(result.requires_human_review).toBe(true);
  });
});

// ===================================================================
// 2. Executor Safety
// ===================================================================
describe('Executor Safety', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';

  interface ApprovedAction {
    tool_name: string;
    risk_class: RiskClass;
    confidence: number;
    critic_approved: boolean;
    params: Record<string, unknown>;
  }

  type ExecutionResult =
    | { status: 'executed'; result: unknown }
    | { status: 'gated'; reason: string }
    | { status: 'skipped'; reason: string }
    | { status: 'failed'; error: string };

  function determineExecution(action: ApprovedAction): ExecutionResult {
    if (!action.critic_approved) {
      return { status: 'skipped', reason: 'Not approved by critic' };
    }
    if (action.risk_class === 'high_risk') {
      return { status: 'gated', reason: 'High-risk requires human approval' };
    }
    if (action.risk_class === 'medium_risk' && action.confidence < 0.7) {
      return { status: 'gated', reason: 'Medium-risk with low confidence' };
    }
    return { status: 'executed', result: { mock: true } };
  }

  it('skips actions not approved by critic', () => {
    const result = determineExecution({
      tool_name: 'recompute_completeness',
      risk_class: 'safe',
      confidence: 0.9,
      critic_approved: false,
      params: {},
    });
    expect(result.status).toBe('skipped');
  });

  it('gates high_risk actions even when critic approved', () => {
    const result = determineExecution({
      tool_name: 'suggest_stage_transition',
      risk_class: 'high_risk',
      confidence: 0.95,
      critic_approved: true,
      params: {},
    });
    expect(result.status).toBe('gated');
  });

  it('gates medium_risk with low confidence', () => {
    const result = determineExecution({
      tool_name: 'assign_owner',
      risk_class: 'medium_risk',
      confidence: 0.5,
      critic_approved: true,
      params: { user_id: 'u1' },
    });
    expect(result.status).toBe('gated');
  });

  it('executes safe approved actions', () => {
    const result = determineExecution({
      tool_name: 'create_notification',
      risk_class: 'safe',
      confidence: 0.9,
      critic_approved: true,
      params: { title: 'Test' },
    });
    expect(result.status).toBe('executed');
  });

  it('executes medium_risk with high confidence', () => {
    const result = determineExecution({
      tool_name: 'assign_owner',
      risk_class: 'medium_risk',
      confidence: 0.85,
      critic_approved: true,
      params: { user_id: 'u1' },
    });
    expect(result.status).toBe('executed');
  });
});

// ===================================================================
// 3. Idempotency Key Generation
// ===================================================================
describe('Idempotency Key Generation', () => {
  function generateIdempotencyKey(
    cycleId: string,
    toolName: string,
    params: Record<string, unknown>,
  ): string {
    const input = `${cycleId}:${toolName}:${JSON.stringify(params, Object.keys(params).sort())}`;
    // Simple hash for testing (real impl uses SHA-256)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  it('generates same key for same inputs', () => {
    const key1 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test' });
    const key2 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test' });
    expect(key1).toBe(key2);
  });

  it('generates different keys for different cycles', () => {
    const key1 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test' });
    const key2 = generateIdempotencyKey('c2', 'create_notification', { title: 'Test' });
    expect(key1).not.toBe(key2);
  });

  it('generates different keys for different tools', () => {
    const key1 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test' });
    const key2 = generateIdempotencyKey('c1', 'create_checklist_item', { title: 'Test' });
    expect(key1).not.toBe(key2);
  });

  it('generates different keys for different params', () => {
    const key1 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test A' });
    const key2 = generateIdempotencyKey('c1', 'create_notification', { title: 'Test B' });
    expect(key1).not.toBe(key2);
  });

  it('is stable regardless of param key order', () => {
    const key1 = generateIdempotencyKey('c1', 'assign_task', { title: 'X', user_id: 'u1' });
    const key2 = generateIdempotencyKey('c1', 'assign_task', { user_id: 'u1', title: 'X' });
    expect(key1).toBe(key2);
  });
});

// ===================================================================
// 4. Pipeline Integration — State Hash Change Detection
// ===================================================================
describe('Pipeline — State Hash Change Detection', () => {
  function computeStateHash(state: Record<string, unknown>): string {
    const sorted = JSON.stringify(state, Object.keys(state).sort());
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  it('same state produces same hash', () => {
    const state = { completeness: 80, stage: 'active', missing_docs: ['a'] };
    expect(computeStateHash(state)).toBe(computeStateHash(state));
  });

  it('different state produces different hash', () => {
    const state1 = { completeness: 80, stage: 'active' };
    const state2 = { completeness: 85, stage: 'active' };
    expect(computeStateHash(state1)).not.toBe(computeStateHash(state2));
  });

  it('key order does not affect hash', () => {
    const state1 = { a: 1, b: 2, c: 3 };
    const state2 = { c: 3, a: 1, b: 2 };
    expect(computeStateHash(state1)).toBe(computeStateHash(state2));
  });

  it('stage change triggers new hash', () => {
    const base = { completeness: 80, missing_docs: [], stage: '' };
    const h1 = computeStateHash({ ...base, stage: 'active' });
    const h2 = computeStateHash({ ...base, stage: 'under_contract' });
    expect(h1).not.toBe(h2);
  });
});

// ===================================================================
// 5. Pipeline — Debounce Logic
// ===================================================================
describe('Pipeline — Debounce Logic', () => {
  const MIN_OBSERVATION_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

  function shouldSkipObservation(
    lastObservedAt: Date | null,
    now: Date,
    trigger: 'scheduled' | 'event' | 'manual',
  ): boolean {
    // Manual triggers always run
    if (trigger === 'manual') return false;
    if (!lastObservedAt) return false;
    const elapsed = now.getTime() - lastObservedAt.getTime();
    return elapsed < MIN_OBSERVATION_INTERVAL_MS;
  }

  it('never skips manual triggers', () => {
    const now = new Date();
    const lastObserved = new Date(now.getTime() - 1000); // 1 second ago
    expect(shouldSkipObservation(lastObserved, now, 'manual')).toBe(false);
  });

  it('skips scheduled trigger within debounce window', () => {
    const now = new Date();
    const lastObserved = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    expect(shouldSkipObservation(lastObserved, now, 'scheduled')).toBe(true);
  });

  it('allows scheduled trigger after debounce window', () => {
    const now = new Date();
    const lastObserved = new Date(now.getTime() - 25 * 60 * 1000); // 25 minutes ago
    expect(shouldSkipObservation(lastObserved, now, 'scheduled')).toBe(false);
  });

  it('allows first-ever observation (no lastObservedAt)', () => {
    const now = new Date();
    expect(shouldSkipObservation(null, now, 'scheduled')).toBe(false);
  });

  it('skips event trigger within debounce window', () => {
    const now = new Date();
    const lastObserved = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
    expect(shouldSkipObservation(lastObserved, now, 'event')).toBe(true);
  });
});

// ===================================================================
// 6. Tool Permission Hierarchy
// ===================================================================
describe('Tool Permission Hierarchy — Expanded', () => {
  type UserRole = 'agent' | 'coordinator' | 'broker_admin';

  const ROLE_HIERARCHY: Record<string, number> = {
    agent: 1,
    coordinator: 2,
    broker_admin: 3,
  };

  const TOOL_REQUIRED_ROLES: Record<string, UserRole> = {
    recompute_completeness: 'agent',
    create_notification: 'agent',
    create_checklist_item: 'agent',
    create_timeline_event: 'agent',
    request_manual_review: 'agent',
    mark_counterparty_waiting: 'agent',
    create_next_action_card: 'agent',
    recompute_exceptions: 'agent',
    recompute_health_score: 'agent',
    create_reminder_draft: 'coordinator',
    create_document_request: 'coordinator',
    assign_owner: 'coordinator',
    assign_task: 'coordinator',
    create_approval_request: 'coordinator',
    suggest_follow_up_draft: 'coordinator',
    suggest_stage_transition: 'broker_admin',
  };

  function isToolAllowed(toolName: string, userRole: UserRole): boolean {
    const required = TOOL_REQUIRED_ROLES[toolName];
    if (!required) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[required] ?? 999);
  }

  it('agent can use all safe tools', () => {
    const safeTools = Object.entries(TOOL_REQUIRED_ROLES)
      .filter(([, role]) => role === 'agent')
      .map(([name]) => name);
    for (const tool of safeTools) {
      expect(isToolAllowed(tool, 'agent')).toBe(true);
    }
  });

  it('agent cannot use coordinator-level tools', () => {
    expect(isToolAllowed('assign_owner', 'agent')).toBe(false);
    expect(isToolAllowed('create_reminder_draft', 'agent')).toBe(false);
    expect(isToolAllowed('assign_task', 'agent')).toBe(false);
  });

  it('agent cannot use broker_admin tools', () => {
    expect(isToolAllowed('suggest_stage_transition', 'agent')).toBe(false);
  });

  it('coordinator can use agent and coordinator tools', () => {
    expect(isToolAllowed('create_notification', 'coordinator')).toBe(true);
    expect(isToolAllowed('assign_owner', 'coordinator')).toBe(true);
    expect(isToolAllowed('create_document_request', 'coordinator')).toBe(true);
  });

  it('coordinator cannot use broker_admin tools', () => {
    expect(isToolAllowed('suggest_stage_transition', 'coordinator')).toBe(false);
  });

  it('broker_admin can use all tools', () => {
    for (const toolName of Object.keys(TOOL_REQUIRED_ROLES)) {
      expect(isToolAllowed(toolName, 'broker_admin')).toBe(true);
    }
  });

  it('unknown tools are rejected for all roles', () => {
    expect(isToolAllowed('delete_everything', 'broker_admin')).toBe(false);
    expect(isToolAllowed('hack_system', 'agent')).toBe(false);
  });
});

// ===================================================================
// 7. Memory Influence on Planning
// ===================================================================
describe('Memory Influence on Planning', () => {
  type MemoryType =
    | 'blocker'
    | 'action_taken'
    | 'failure_pattern'
    | 'human_correction'
    | 'recommendation_given'
    | 'counterparty_signal'
    | 'pending_decision';

  interface MemoryEntry {
    type: MemoryType;
    resolved: boolean;
    details: string;
    importance: number;
  }

  function prioritizeMemory(entries: MemoryEntry[]): MemoryEntry[] {
    return entries
      .filter(e => !e.resolved)
      .sort((a, b) => {
        // Blockers first, then by importance
        if (a.type === 'blocker' && b.type !== 'blocker') return -1;
        if (b.type === 'blocker' && a.type !== 'blocker') return 1;
        // Human corrections next
        if (a.type === 'human_correction' && b.type !== 'human_correction') return -1;
        if (b.type === 'human_correction' && a.type !== 'human_correction') return 1;
        return b.importance - a.importance;
      });
  }

  function shouldAvoidAction(
    toolName: string,
    memory: MemoryEntry[],
  ): boolean {
    // Avoid repeating actions that failed multiple times
    const failures = memory.filter(
      m => m.type === 'failure_pattern' && !m.resolved && m.details.includes(toolName),
    );
    if (failures.length >= 2) return true;
    // Avoid repeating ignored recommendations
    const ignored = memory.filter(
      m => m.type === 'recommendation_given' && !m.resolved && m.details.includes(toolName),
    );
    if (ignored.length >= 3) return true;
    return false;
  }

  it('blockers are prioritized first', () => {
    const entries: MemoryEntry[] = [
      { type: 'action_taken', resolved: false, details: 'sent notification', importance: 3 },
      { type: 'blocker', resolved: false, details: 'missing signature', importance: 5 },
      { type: 'counterparty_signal', resolved: false, details: 'unresponsive', importance: 7 },
    ];
    const prioritized = prioritizeMemory(entries);
    expect(prioritized[0].type).toBe('blocker');
  });

  it('resolved entries are filtered out', () => {
    const entries: MemoryEntry[] = [
      { type: 'blocker', resolved: true, details: 'was blocked', importance: 10 },
      { type: 'action_taken', resolved: false, details: 'active', importance: 1 },
    ];
    const prioritized = prioritizeMemory(entries);
    expect(prioritized.length).toBe(1);
    expect(prioritized[0].type).toBe('action_taken');
  });

  it('human corrections rank second after blockers', () => {
    const entries: MemoryEntry[] = [
      { type: 'counterparty_signal', resolved: false, details: 'signal', importance: 10 },
      { type: 'human_correction', resolved: false, details: 'override', importance: 5 },
      { type: 'blocker', resolved: false, details: 'block', importance: 3 },
    ];
    const prioritized = prioritizeMemory(entries);
    expect(prioritized[0].type).toBe('blocker');
    expect(prioritized[1].type).toBe('human_correction');
  });

  it('avoids actions with repeated failures', () => {
    const memory: MemoryEntry[] = [
      { type: 'failure_pattern', resolved: false, details: 'assign_owner failed', importance: 5 },
      { type: 'failure_pattern', resolved: false, details: 'assign_owner timeout', importance: 5 },
    ];
    expect(shouldAvoidAction('assign_owner', memory)).toBe(true);
  });

  it('does not avoid actions with single failure', () => {
    const memory: MemoryEntry[] = [
      { type: 'failure_pattern', resolved: false, details: 'assign_owner failed', importance: 5 },
    ];
    expect(shouldAvoidAction('assign_owner', memory)).toBe(false);
  });

  it('avoids actions with too many ignored recommendations', () => {
    const memory: MemoryEntry[] = [
      { type: 'recommendation_given', resolved: false, details: 'create_notification suggested', importance: 3 },
      { type: 'recommendation_given', resolved: false, details: 'create_notification suggested', importance: 3 },
      { type: 'recommendation_given', resolved: false, details: 'create_notification suggested', importance: 3 },
    ];
    expect(shouldAvoidAction('create_notification', memory)).toBe(true);
  });

  it('resolved failures do not count', () => {
    const memory: MemoryEntry[] = [
      { type: 'failure_pattern', resolved: true, details: 'assign_owner failed', importance: 5 },
      { type: 'failure_pattern', resolved: true, details: 'assign_owner failed', importance: 5 },
      { type: 'failure_pattern', resolved: false, details: 'assign_owner failed', importance: 5 },
    ];
    expect(shouldAvoidAction('assign_owner', memory)).toBe(false);
  });
});

// ===================================================================
// 8. Action Deduplication & Freshness
// ===================================================================
describe('Action Deduplication & Freshness', () => {
  interface NextAction {
    id: string;
    title: string;
    status: 'active' | 'stale' | 'resolved' | 'dismissed';
    created_at: string;
    stale_after: string;
  }

  function isDuplicate(existing: NextAction[], newTitle: string): boolean {
    return existing.some(a => a.status === 'active' && a.title === newTitle);
  }

  function getStaleActions(actions: NextAction[], now: Date): NextAction[] {
    return actions.filter(
      a => a.status === 'active' && new Date(a.stale_after).getTime() < now.getTime(),
    );
  }

  const STALE_HOURS = 48;

  it('detects duplicate active actions', () => {
    const existing: NextAction[] = [
      { id: '1', title: 'Upload missing disclosure', status: 'active', created_at: '2026-01-01', stale_after: '2026-01-03' },
    ];
    expect(isDuplicate(existing, 'Upload missing disclosure')).toBe(true);
  });

  it('does not flag resolved actions as duplicates', () => {
    const existing: NextAction[] = [
      { id: '1', title: 'Upload disclosure', status: 'resolved', created_at: '2026-01-01', stale_after: '2026-01-03' },
    ];
    expect(isDuplicate(existing, 'Upload disclosure')).toBe(false);
  });

  it('does not flag dismissed actions as duplicates', () => {
    const existing: NextAction[] = [
      { id: '1', title: 'Upload disclosure', status: 'dismissed', created_at: '2026-01-01', stale_after: '2026-01-03' },
    ];
    expect(isDuplicate(existing, 'Upload disclosure')).toBe(false);
  });

  it('identifies stale actions past threshold', () => {
    const now = new Date('2026-01-05T00:00:00Z');
    const actions: NextAction[] = [
      { id: '1', title: 'Old action', status: 'active', created_at: '2026-01-01T00:00:00Z', stale_after: '2026-01-03T00:00:00Z' },
      { id: '2', title: 'Fresh action', status: 'active', created_at: '2026-01-04T00:00:00Z', stale_after: '2026-01-06T00:00:00Z' },
    ];
    const stale = getStaleActions(actions, now);
    expect(stale.length).toBe(1);
    expect(stale[0].id).toBe('1');
  });

  it('does not flag already-stale actions as stale again', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    const actions: NextAction[] = [
      { id: '1', title: 'Already stale', status: 'stale', created_at: '2026-01-01T00:00:00Z', stale_after: '2026-01-03T00:00:00Z' },
    ];
    const stale = getStaleActions(actions, now);
    expect(stale.length).toBe(0);
  });

  it('stale threshold is 48 hours', () => {
    expect(STALE_HOURS).toBe(48);
    const created = new Date('2026-01-01T00:00:00Z');
    const staleAfter = new Date(created.getTime() + STALE_HOURS * 60 * 60 * 1000);
    expect(staleAfter.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });
});

// ===================================================================
// 9. Org Isolation
// ===================================================================
describe('Org Isolation', () => {
  interface Orchestrator {
    id: string;
    organization_id: string;
    entity_id: string;
  }

  function canAccessOrchestrator(
    orchestrator: Orchestrator,
    userOrgId: string,
  ): boolean {
    return orchestrator.organization_id === userOrgId;
  }

  it('allows access when org matches', () => {
    const orch: Orchestrator = { id: 'o1', organization_id: 'org-1', entity_id: 'e1' };
    expect(canAccessOrchestrator(orch, 'org-1')).toBe(true);
  });

  it('denies access when org does not match', () => {
    const orch: Orchestrator = { id: 'o1', organization_id: 'org-1', entity_id: 'e1' };
    expect(canAccessOrchestrator(orch, 'org-2')).toBe(false);
  });

  it('denies access with empty org id', () => {
    const orch: Orchestrator = { id: 'o1', organization_id: 'org-1', entity_id: 'e1' };
    expect(canAccessOrchestrator(orch, '')).toBe(false);
  });
});

// ===================================================================
// 10. Tool Contract Validation
// ===================================================================
describe('Tool Contract Validation', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';
  type UserRole = 'agent' | 'coordinator' | 'broker_admin';

  const VALID_RISK_CLASSES: RiskClass[] = ['safe', 'medium_risk', 'high_risk'];
  const VALID_ROLES: UserRole[] = ['agent', 'coordinator', 'broker_admin'];

  interface ToolContract {
    name: string;
    risk_class: string;
    required_role: string;
  }

  function validateContract(contract: ToolContract): string[] {
    const errors: string[] = [];
    if (!contract.name || typeof contract.name !== 'string') {
      errors.push('name must be a non-empty string');
    }
    if (!VALID_RISK_CLASSES.includes(contract.risk_class as RiskClass)) {
      errors.push(`invalid risk_class: ${contract.risk_class}`);
    }
    if (!VALID_ROLES.includes(contract.required_role as UserRole)) {
      errors.push(`invalid required_role: ${contract.required_role}`);
    }
    return errors;
  }

  it('accepts valid contract', () => {
    const errors = validateContract({ name: 'test_tool', risk_class: 'safe', required_role: 'agent' });
    expect(errors).toHaveLength(0);
  });

  it('rejects empty name', () => {
    const errors = validateContract({ name: '', risk_class: 'safe', required_role: 'agent' });
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });

  it('rejects invalid risk class', () => {
    const errors = validateContract({ name: 'test', risk_class: 'extreme', required_role: 'agent' });
    expect(errors.some(e => e.includes('risk_class'))).toBe(true);
  });

  it('rejects invalid role', () => {
    const errors = validateContract({ name: 'test', risk_class: 'safe', required_role: 'superadmin' });
    expect(errors.some(e => e.includes('required_role'))).toBe(true);
  });

  it('reports multiple errors at once', () => {
    const errors = validateContract({ name: '', risk_class: 'bad', required_role: 'bad' });
    expect(errors.length).toBe(3);
  });
});

// ===================================================================
// 11. Param Validation
// ===================================================================
describe('Param Validation', () => {
  interface ParamSpec {
    type: string;
    required: boolean;
  }

  function validateParams(
    schema: Record<string, ParamSpec>,
    params: Record<string, unknown>,
  ): string[] {
    const errors: string[] = [];
    for (const [name, spec] of Object.entries(schema)) {
      const value = params[name];
      if (spec.required && (value === undefined || value === null)) {
        errors.push(`Missing required: ${name}`);
        continue;
      }
      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (spec.type === 'array' && !Array.isArray(value)) {
          errors.push(`${name} must be array`);
        } else if (spec.type !== 'array' && actualType !== spec.type) {
          errors.push(`${name} must be ${spec.type}, got ${actualType}`);
        }
      }
    }
    return errors;
  }

  const schema: Record<string, ParamSpec> = {
    title: { type: 'string', required: true },
    count: { type: 'number', required: false },
    tags: { type: 'array', required: false },
  };

  it('passes valid params', () => {
    expect(validateParams(schema, { title: 'Test' })).toHaveLength(0);
  });

  it('catches missing required param', () => {
    expect(validateParams(schema, {})).toContain('Missing required: title');
  });

  it('catches type mismatch', () => {
    const errors = validateParams(schema, { title: 'Test', count: 'not a number' });
    expect(errors.some(e => e.includes('count'))).toBe(true);
  });

  it('catches array type mismatch', () => {
    const errors = validateParams(schema, { title: 'Test', tags: 'not an array' });
    expect(errors.some(e => e.includes('tags'))).toBe(true);
  });

  it('allows null for optional params', () => {
    expect(validateParams(schema, { title: 'Test', count: null })).toHaveLength(0);
  });

  it('rejects null for required params', () => {
    const errors = validateParams(schema, { title: null });
    expect(errors).toContain('Missing required: title');
  });
});

// ===================================================================
// 12. Pipeline — Cycle Status Tracking
// ===================================================================
describe('Pipeline — Cycle Status Tracking', () => {
  type CycleStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed';

  interface ExecutionSummary {
    total_executed: number;
    total_gated: number;
    total_failed: number;
    total_skipped: number;
  }

  function determineCycleStatus(summary: ExecutionSummary): CycleStatus {
    if (summary.total_executed === 0 && summary.total_failed > 0) return 'failed';
    if (summary.total_failed > 0) return 'completed_with_errors';
    return 'completed';
  }

  it('completed when all succeed', () => {
    expect(determineCycleStatus({ total_executed: 3, total_gated: 0, total_failed: 0, total_skipped: 0 }))
      .toBe('completed');
  });

  it('completed_with_errors on partial failure', () => {
    expect(determineCycleStatus({ total_executed: 2, total_gated: 0, total_failed: 1, total_skipped: 0 }))
      .toBe('completed_with_errors');
  });

  it('failed when all fail', () => {
    expect(determineCycleStatus({ total_executed: 0, total_gated: 0, total_failed: 3, total_skipped: 0 }))
      .toBe('failed');
  });

  it('completed when some gated and rest succeed', () => {
    expect(determineCycleStatus({ total_executed: 1, total_gated: 2, total_failed: 0, total_skipped: 0 }))
      .toBe('completed');
  });

  it('completed when some skipped and rest succeed', () => {
    expect(determineCycleStatus({ total_executed: 2, total_gated: 0, total_failed: 0, total_skipped: 1 }))
      .toBe('completed');
  });
});

// ===================================================================
// 13. World State — Missing Document Detection
// ===================================================================
describe('World State — Missing Document Detection', () => {
  const REQUIRED_DOC_TYPES = ['purchase_agreement', 'disclosure', 'inspection_report', 'title_report'];

  function findMissingDocs(existingDocTypes: string[]): string[] {
    return REQUIRED_DOC_TYPES.filter(t => !existingDocTypes.includes(t));
  }

  it('identifies all missing when no docs exist', () => {
    expect(findMissingDocs([])).toEqual(REQUIRED_DOC_TYPES);
  });

  it('identifies partial missing docs', () => {
    const missing = findMissingDocs(['purchase_agreement', 'disclosure']);
    expect(missing).toEqual(['inspection_report', 'title_report']);
  });

  it('returns empty when all docs present', () => {
    expect(findMissingDocs(REQUIRED_DOC_TYPES)).toEqual([]);
  });

  it('ignores extra doc types', () => {
    const missing = findMissingDocs([...REQUIRED_DOC_TYPES, 'addendum', 'amendment']);
    expect(missing).toEqual([]);
  });
});

// ===================================================================
// 14. World State Cache TTL
// ===================================================================
describe('World State Cache TTL', () => {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function isCacheValid(cachedAt: number, now: number): boolean {
    return now - cachedAt < CACHE_TTL_MS;
  }

  it('valid within TTL', () => {
    const now = Date.now();
    expect(isCacheValid(now - 2 * 60 * 1000, now)).toBe(true); // 2 minutes ago
  });

  it('invalid after TTL', () => {
    const now = Date.now();
    expect(isCacheValid(now - 6 * 60 * 1000, now)).toBe(false); // 6 minutes ago
  });

  it('valid at exactly TTL boundary minus 1ms', () => {
    const now = Date.now();
    expect(isCacheValid(now - CACHE_TTL_MS + 1, now)).toBe(true);
  });

  it('invalid at exactly TTL', () => {
    const now = Date.now();
    expect(isCacheValid(now - CACHE_TTL_MS, now)).toBe(false);
  });
});
