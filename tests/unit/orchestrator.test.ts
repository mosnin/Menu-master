import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Deal Orchestrator Tests — pure unit tests for orchestrator logic.
// No DB calls; all logic tested via local function definitions.
// ---------------------------------------------------------------------------

// ===================================================================
// 1. World State Aggregation Structure
// ===================================================================
describe('World State Snapshot Structure', () => {
  interface WorldStateSnapshot {
    entity_type: 'transaction' | 'listing';
    entity_id: string;
    stage: string;
    readiness: string;
    completeness_score: number;
    unresolved_exceptions: number;
    missing_docs: string[];
    pending_approvals: number;
    open_obligations: number;
    overdue_obligations: number;
    urgent_deadlines: { description: string; due_at: string; days_remaining: number }[];
    compliance_flags: string[];
    health_score: number | null;
  }

  function assessWorldState(state: WorldStateSnapshot): {
    needs_attention: boolean;
    top_concern: string | null;
    urgency: 'low' | 'normal' | 'high' | 'critical';
  } {
    if (state.completeness_score < 30) {
      return { needs_attention: true, top_concern: 'Very low completeness', urgency: 'critical' };
    }
    if (state.overdue_obligations > 0) {
      return { needs_attention: true, top_concern: 'Overdue obligations', urgency: 'high' };
    }
    if (state.unresolved_exceptions > 2) {
      return { needs_attention: true, top_concern: 'Multiple unresolved exceptions', urgency: 'high' };
    }
    if (state.missing_docs.length > 0) {
      return { needs_attention: true, top_concern: 'Missing documents', urgency: 'normal' };
    }
    if (state.pending_approvals > 0) {
      return { needs_attention: true, top_concern: 'Pending approvals', urgency: 'normal' };
    }
    if (state.compliance_flags.length > 0) {
      return { needs_attention: true, top_concern: 'Compliance concerns', urgency: 'high' };
    }
    return { needs_attention: false, top_concern: null, urgency: 'low' };
  }

  it('critical urgency for very low completeness', () => {
    const result = assessWorldState({
      entity_type: 'transaction', entity_id: 't1', stage: 'active', readiness: 'not_ready',
      completeness_score: 20, unresolved_exceptions: 0, missing_docs: [], pending_approvals: 0,
      open_obligations: 0, overdue_obligations: 0, urgent_deadlines: [], compliance_flags: [], health_score: null,
    });
    expect(result.urgency).toBe('critical');
  });

  it('high urgency for overdue obligations', () => {
    const result = assessWorldState({
      entity_type: 'transaction', entity_id: 't1', stage: 'active', readiness: 'needs_attention',
      completeness_score: 60, unresolved_exceptions: 0, missing_docs: [], pending_approvals: 0,
      open_obligations: 3, overdue_obligations: 2, urgent_deadlines: [], compliance_flags: [], health_score: 50,
    });
    expect(result.urgency).toBe('high');
    expect(result.top_concern).toBe('Overdue obligations');
  });

  it('normal urgency for missing docs', () => {
    const result = assessWorldState({
      entity_type: 'transaction', entity_id: 't1', stage: 'active', readiness: 'needs_attention',
      completeness_score: 70, unresolved_exceptions: 0, missing_docs: ['disclosure'], pending_approvals: 0,
      open_obligations: 0, overdue_obligations: 0, urgent_deadlines: [], compliance_flags: [], health_score: 65,
    });
    expect(result.urgency).toBe('normal');
    expect(result.top_concern).toBe('Missing documents');
  });

  it('low urgency when everything is fine', () => {
    const result = assessWorldState({
      entity_type: 'transaction', entity_id: 't1', stage: 'active', readiness: 'ready',
      completeness_score: 95, unresolved_exceptions: 0, missing_docs: [], pending_approvals: 0,
      open_obligations: 0, overdue_obligations: 0, urgent_deadlines: [], compliance_flags: [], health_score: 90,
    });
    expect(result.needs_attention).toBe(false);
    expect(result.urgency).toBe('low');
  });

  it('compliance flags trigger high urgency', () => {
    const result = assessWorldState({
      entity_type: 'transaction', entity_id: 't1', stage: 'active', readiness: 'nearly_ready',
      completeness_score: 80, unresolved_exceptions: 0, missing_docs: [], pending_approvals: 0,
      open_obligations: 0, overdue_obligations: 0, urgent_deadlines: [], compliance_flags: ['critical:missing_disclosure'], health_score: 75,
    });
    expect(result.urgency).toBe('high');
  });
});

// ===================================================================
// 2. Action Risk Classification
// ===================================================================
describe('Action Risk Classification', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';

  const TOOL_RISK_MAP: Record<string, RiskClass> = {
    recompute_completeness: 'safe',
    recompute_exceptions: 'safe',
    recompute_health_score: 'safe',
    create_notification: 'safe',
    create_checklist_item: 'safe',
    create_timeline_event: 'safe',
    request_manual_review: 'safe',
    mark_counterparty_waiting: 'safe',
    create_next_action_card: 'safe',
    create_reminder_draft: 'medium_risk',
    create_document_request: 'medium_risk',
    assign_owner: 'medium_risk',
    assign_task: 'medium_risk',
    create_approval_request: 'medium_risk',
    suggest_follow_up_draft: 'medium_risk',
    suggest_stage_transition: 'high_risk',
  };

  function isAutoExecutable(toolName: string): boolean {
    return TOOL_RISK_MAP[toolName] === 'safe';
  }

  function requiresHumanReview(toolName: string, confidence: number): boolean {
    const risk = TOOL_RISK_MAP[toolName];
    if (risk === 'high_risk') return true;
    if (risk === 'medium_risk' && confidence < 0.7) return true;
    return false;
  }

  it('safe tools are auto-executable', () => {
    expect(isAutoExecutable('recompute_completeness')).toBe(true);
    expect(isAutoExecutable('create_notification')).toBe(true);
    expect(isAutoExecutable('create_next_action_card')).toBe(true);
  });

  it('medium_risk tools are not auto-executable', () => {
    expect(isAutoExecutable('create_reminder_draft')).toBe(false);
    expect(isAutoExecutable('create_document_request')).toBe(false);
    expect(isAutoExecutable('assign_owner')).toBe(false);
  });

  it('high_risk tools always require human review', () => {
    expect(requiresHumanReview('suggest_stage_transition', 1.0)).toBe(true);
    expect(requiresHumanReview('suggest_stage_transition', 0.99)).toBe(true);
  });

  it('medium_risk tools require review when low confidence', () => {
    expect(requiresHumanReview('create_reminder_draft', 0.5)).toBe(true);
    expect(requiresHumanReview('create_reminder_draft', 0.8)).toBe(false);
  });

  it('safe tools never require review', () => {
    expect(requiresHumanReview('recompute_completeness', 0.1)).toBe(false);
    expect(requiresHumanReview('create_notification', 0.3)).toBe(false);
  });
});

// ===================================================================
// 3. Critic Gating Logic
// ===================================================================
describe('Critic Gating Logic', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';

  interface ProposedAction {
    tool_name: string;
    risk_class: RiskClass;
    confidence: number;
    reason: string;
  }

  interface WorldContext {
    stage: string;
    completeness_score: number;
    compliance_flags: string[];
    missing_docs: string[];
  }

  function criticReview(action: ProposedAction, context: WorldContext): {
    approved: boolean;
    concerns: string[];
    requires_human_review: boolean;
    suggested_risk_class: RiskClass | null;
  } {
    const concerns: string[] = [];
    let approved = true;
    let suggestedRisk: RiskClass | null = null;

    // Reject actions on closed/cancelled entities
    if (context.stage === 'closed' || context.stage === 'cancelled') {
      concerns.push('Entity is closed/cancelled');
      return { approved: false, concerns, requires_human_review: false, suggested_risk_class: null };
    }

    // Stage transitions with missing docs should be escalated
    if (action.tool_name === 'suggest_stage_transition' && context.missing_docs.length > 0) {
      concerns.push(`Missing documents: ${context.missing_docs.join(', ')}`);
      suggestedRisk = 'high_risk';
    }

    // Compliance flags make medium_risk actions high_risk
    if (context.compliance_flags.length > 0 && action.risk_class === 'medium_risk') {
      concerns.push('Active compliance flags present');
      suggestedRisk = 'high_risk';
    }

    // Low confidence medium_risk actions need human review
    const needsHuman = action.risk_class === 'high_risk' ||
      (action.risk_class === 'medium_risk' && action.confidence < 0.7) ||
      suggestedRisk === 'high_risk';

    return { approved, concerns, requires_human_review: needsHuman, suggested_risk_class: suggestedRisk };
  }

  const baseContext: WorldContext = { stage: 'active', completeness_score: 70, compliance_flags: [], missing_docs: [] };

  it('approves safe actions in normal context', () => {
    const result = criticReview(
      { tool_name: 'recompute_completeness', risk_class: 'safe', confidence: 0.9, reason: 'test' },
      baseContext,
    );
    expect(result.approved).toBe(true);
    expect(result.requires_human_review).toBe(false);
  });

  it('rejects actions on closed entities', () => {
    const result = criticReview(
      { tool_name: 'create_notification', risk_class: 'safe', confidence: 0.9, reason: 'test' },
      { ...baseContext, stage: 'closed' },
    );
    expect(result.approved).toBe(false);
  });

  it('flags stage transitions with missing docs', () => {
    const result = criticReview(
      { tool_name: 'suggest_stage_transition', risk_class: 'high_risk', confidence: 0.8, reason: 'test' },
      { ...baseContext, missing_docs: ['disclosure'] },
    );
    expect(result.concerns).toContain('Missing documents: disclosure');
    expect(result.requires_human_review).toBe(true);
  });

  it('escalates medium_risk actions when compliance flags exist', () => {
    const result = criticReview(
      { tool_name: 'create_reminder_draft', risk_class: 'medium_risk', confidence: 0.8, reason: 'test' },
      { ...baseContext, compliance_flags: ['critical:missing_disclosure'] },
    );
    expect(result.suggested_risk_class).toBe('high_risk');
    expect(result.requires_human_review).toBe(true);
  });

  it('requires human review for low confidence medium_risk', () => {
    const result = criticReview(
      { tool_name: 'assign_owner', risk_class: 'medium_risk', confidence: 0.5, reason: 'test' },
      baseContext,
    );
    expect(result.requires_human_review).toBe(true);
  });
});

// ===================================================================
// 4. Tool Permission Checks
// ===================================================================
describe('Tool Permission Checks', () => {
  const ROLE_HIERARCHY: Record<string, number> = { agent: 1, coordinator: 2, broker_admin: 3 };

  const TOOL_REQUIRED_ROLES: Record<string, string> = {
    recompute_completeness: 'agent',
    create_notification: 'agent',
    create_checklist_item: 'coordinator',
    create_reminder_draft: 'coordinator',
    suggest_stage_transition: 'broker_admin',
  };

  function isToolAllowed(toolName: string, userRole: string): boolean {
    const required = TOOL_REQUIRED_ROLES[toolName];
    if (!required) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[required] ?? 999);
  }

  it('agent can use agent-level tools', () => {
    expect(isToolAllowed('recompute_completeness', 'agent')).toBe(true);
    expect(isToolAllowed('create_notification', 'agent')).toBe(true);
  });

  it('agent cannot use coordinator-level tools', () => {
    expect(isToolAllowed('create_checklist_item', 'agent')).toBe(false);
    expect(isToolAllowed('create_reminder_draft', 'agent')).toBe(false);
  });

  it('coordinator can use coordinator-level tools', () => {
    expect(isToolAllowed('create_checklist_item', 'coordinator')).toBe(true);
    expect(isToolAllowed('create_reminder_draft', 'coordinator')).toBe(true);
  });

  it('coordinator cannot use broker_admin tools', () => {
    expect(isToolAllowed('suggest_stage_transition', 'coordinator')).toBe(false);
  });

  it('broker_admin can use all tools', () => {
    expect(isToolAllowed('recompute_completeness', 'broker_admin')).toBe(true);
    expect(isToolAllowed('create_checklist_item', 'broker_admin')).toBe(true);
    expect(isToolAllowed('suggest_stage_transition', 'broker_admin')).toBe(true);
  });

  it('unknown tool is not allowed', () => {
    expect(isToolAllowed('nonexistent_tool', 'broker_admin')).toBe(false);
  });
});

// ===================================================================
// 5. Action Deduplication and Freshness
// ===================================================================
describe('Action Deduplication and Freshness', () => {
  interface NextAction {
    id: string;
    title: string;
    tool_name: string | null;
    status: 'active' | 'stale' | 'resolved' | 'dismissed';
    stale_after: string | null;
    created_at: string;
  }

  function isDuplicate(existing: NextAction[], proposed: { title: string; tool_name: string }): boolean {
    return existing.some(
      (a) => a.status === 'active' && (a.title === proposed.title || a.tool_name === proposed.tool_name),
    );
  }

  function isStale(action: NextAction): boolean {
    if (!action.stale_after) return false;
    return new Date(action.stale_after) < new Date();
  }

  function selectPrimaryAction(actions: NextAction[]): NextAction | null {
    const active = actions.filter((a) => a.status === 'active');
    return active[0] ?? null;
  }

  const existingActions: NextAction[] = [
    { id: '1', title: 'Upload missing disclosure', tool_name: 'create_document_request', status: 'active', stale_after: '2027-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
    { id: '2', title: 'Review pending approval', tool_name: 'create_notification', status: 'active', stale_after: null, created_at: '2026-01-02T00:00:00Z' },
  ];

  it('detects duplicate by title', () => {
    expect(isDuplicate(existingActions, { title: 'Upload missing disclosure', tool_name: 'other_tool' })).toBe(true);
  });

  it('detects duplicate by tool_name', () => {
    expect(isDuplicate(existingActions, { title: 'Different title', tool_name: 'create_document_request' })).toBe(true);
  });

  it('allows new unique actions', () => {
    expect(isDuplicate(existingActions, { title: 'New action', tool_name: 'new_tool' })).toBe(false);
  });

  it('does not consider dismissed actions as duplicates', () => {
    const dismissed: NextAction[] = [
      { id: '1', title: 'Upload missing disclosure', tool_name: 'create_document_request', status: 'dismissed', stale_after: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    expect(isDuplicate(dismissed, { title: 'Upload missing disclosure', tool_name: 'create_document_request' })).toBe(false);
  });

  it('detects stale actions by expiry', () => {
    expect(isStale({ ...existingActions[0], stale_after: '2020-01-01T00:00:00Z' })).toBe(true);
    expect(isStale({ ...existingActions[0], stale_after: '2027-01-01T00:00:00Z' })).toBe(false);
  });

  it('actions without stale_after are never stale', () => {
    expect(isStale(existingActions[1])).toBe(false);
  });

  it('selects first active action as primary', () => {
    const primary = selectPrimaryAction(existingActions);
    expect(primary?.id).toBe('1');
  });
});

// ===================================================================
// 6. Memory Compaction
// ===================================================================
describe('Memory Compaction', () => {
  interface MemoryEntry {
    id: string;
    memory_type: string;
    summary: string;
    resolved: boolean;
    created_at: string;
  }

  function shouldCompact(entries: MemoryEntry[], maxUnresolved: number): boolean {
    const unresolved = entries.filter((e) => !e.resolved);
    return unresolved.length > maxUnresolved;
  }

  function compactEntries(entries: MemoryEntry[], keepRecent: number): {
    keep: MemoryEntry[];
    archive: MemoryEntry[];
  } {
    const sorted = [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const unresolved = sorted.filter((e) => !e.resolved);
    const resolved = sorted.filter((e) => e.resolved);

    // Keep all unresolved + recent N resolved
    const keep = [...unresolved, ...resolved.slice(0, keepRecent)];
    const archive = resolved.slice(keepRecent);

    return { keep, archive };
  }

  const entries: MemoryEntry[] = [
    { id: '1', memory_type: 'blocker', summary: 'Missing docs', resolved: false, created_at: '2026-01-05T00:00:00Z' },
    { id: '2', memory_type: 'action_taken', summary: 'Sent notification', resolved: true, created_at: '2026-01-04T00:00:00Z' },
    { id: '3', memory_type: 'action_taken', summary: 'Computed completeness', resolved: true, created_at: '2026-01-03T00:00:00Z' },
    { id: '4', memory_type: 'action_taken', summary: 'Created reminder', resolved: true, created_at: '2026-01-02T00:00:00Z' },
    { id: '5', memory_type: 'action_taken', summary: 'Old action', resolved: true, created_at: '2026-01-01T00:00:00Z' },
  ];

  it('does not compact when under threshold', () => {
    expect(shouldCompact(entries, 10)).toBe(false);
  });

  it('compacts when over threshold', () => {
    const manyUnresolved = Array.from({ length: 25 }, (_, i) => ({
      id: String(i), memory_type: 'blocker', summary: `Blocker ${i}`, resolved: false, created_at: '2026-01-01T00:00:00Z',
    }));
    expect(shouldCompact(manyUnresolved, 20)).toBe(true);
  });

  it('keeps all unresolved entries during compaction', () => {
    const { keep, archive } = compactEntries(entries, 2);
    expect(keep.some((e) => e.id === '1')).toBe(true); // unresolved
    expect(archive.every((e) => e.resolved)).toBe(true); // only resolved get archived
  });

  it('keeps recent resolved entries and archives old ones', () => {
    const { keep, archive } = compactEntries(entries, 2);
    // Should keep 1 unresolved + 2 most recent resolved
    expect(keep).toHaveLength(3);
    expect(archive).toHaveLength(2);
    expect(archive.some((e) => e.id === '4')).toBe(true);
    expect(archive.some((e) => e.id === '5')).toBe(true);
  });
});

// ===================================================================
// 7. Observation Loop Debouncing
// ===================================================================
describe('Observation Loop Debouncing', () => {
  function shouldObserve(
    lastObservedAt: string | null,
    triggerType: string,
    cooldownMinutes: number,
  ): boolean {
    // Manual triggers always observe
    if (triggerType === 'manual') return true;

    // If never observed, always observe
    if (!lastObservedAt) return true;

    // Check cooldown
    const lastTime = new Date(lastObservedAt).getTime();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastTime > cooldownMs;
  }

  it('always observes on manual trigger', () => {
    expect(shouldObserve(new Date().toISOString(), 'manual', 30)).toBe(true);
  });

  it('always observes if never observed before', () => {
    expect(shouldObserve(null, 'scheduled', 30)).toBe(true);
  });

  it('observes after cooldown expires', () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    expect(shouldObserve(fortyMinAgo, 'scheduled', 30)).toBe(true);
  });

  it('skips observation within cooldown', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(shouldObserve(fiveMinAgo, 'scheduled', 30)).toBe(false);
  });

  it('event triggers respect cooldown too', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(shouldObserve(fiveMinAgo, 'document_uploaded', 2)).toBe(true);  // 2 min cooldown, 5 min ago
    expect(shouldObserve(fiveMinAgo, 'document_uploaded', 10)).toBe(false); // 10 min cooldown, 5 min ago
  });
});

// ===================================================================
// 8. Orchestrator Org Isolation
// ===================================================================
describe('Orchestrator Org Isolation', () => {
  interface Orchestrator {
    id: string;
    organization_id: string;
    entity_type: string;
    entity_id: string;
  }

  function canAccessOrchestrator(orchestrator: Orchestrator, userOrgId: string): boolean {
    return orchestrator.organization_id === userOrgId;
  }

  it('allows access within same org', () => {
    expect(canAccessOrchestrator({ id: 'o1', organization_id: 'org-1', entity_type: 'transaction', entity_id: 't1' }, 'org-1')).toBe(true);
  });

  it('denies access across orgs', () => {
    expect(canAccessOrchestrator({ id: 'o1', organization_id: 'org-1', entity_type: 'transaction', entity_id: 't1' }, 'org-2')).toBe(false);
  });
});

// ===================================================================
// 9. Planner Output Validation
// ===================================================================
describe('Planner Output Validation', () => {
  interface PlannerOutput {
    reasoning_summary: string;
    proposed_actions: { tool_name: string; risk_class: string; confidence: number }[];
    urgency_assessment: string;
  }

  const VALID_TOOLS = new Set([
    'recompute_completeness', 'recompute_exceptions', 'recompute_health_score',
    'create_notification', 'create_checklist_item', 'create_timeline_event',
    'create_reminder_draft', 'create_document_request', 'assign_owner',
    'request_manual_review', 'create_approval_request', 'suggest_stage_transition',
    'suggest_follow_up_draft', 'mark_counterparty_waiting', 'create_next_action_card',
    'assign_task',
  ]);

  const VALID_RISK_CLASSES = new Set(['safe', 'medium_risk', 'high_risk']);
  const VALID_URGENCIES = new Set(['low', 'normal', 'high', 'critical']);

  function validatePlannerOutput(output: PlannerOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!output.reasoning_summary) errors.push('Missing reasoning_summary');
    if (!VALID_URGENCIES.has(output.urgency_assessment)) errors.push(`Invalid urgency: ${output.urgency_assessment}`);

    for (const action of output.proposed_actions) {
      if (!VALID_TOOLS.has(action.tool_name)) errors.push(`Unknown tool: ${action.tool_name}`);
      if (!VALID_RISK_CLASSES.has(action.risk_class)) errors.push(`Invalid risk class: ${action.risk_class}`);
      if (action.confidence < 0 || action.confidence > 1) errors.push(`Invalid confidence: ${action.confidence}`);
    }

    return { valid: errors.length === 0, errors };
  }

  it('accepts valid planner output', () => {
    const result = validatePlannerOutput({
      reasoning_summary: 'Deal needs attention',
      proposed_actions: [{ tool_name: 'recompute_completeness', risk_class: 'safe', confidence: 0.9 }],
      urgency_assessment: 'normal',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown tools', () => {
    const result = validatePlannerOutput({
      reasoning_summary: 'test',
      proposed_actions: [{ tool_name: 'delete_everything', risk_class: 'safe', confidence: 0.9 }],
      urgency_assessment: 'normal',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unknown tool');
  });

  it('rejects invalid risk class', () => {
    const result = validatePlannerOutput({
      reasoning_summary: 'test',
      proposed_actions: [{ tool_name: 'create_notification', risk_class: 'extreme', confidence: 0.9 }],
      urgency_assessment: 'normal',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects out-of-range confidence', () => {
    const result = validatePlannerOutput({
      reasoning_summary: 'test',
      proposed_actions: [{ tool_name: 'create_notification', risk_class: 'safe', confidence: 1.5 }],
      urgency_assessment: 'normal',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects missing reasoning', () => {
    const result = validatePlannerOutput({
      reasoning_summary: '',
      proposed_actions: [],
      urgency_assessment: 'normal',
    });
    expect(result.valid).toBe(false);
  });
});
