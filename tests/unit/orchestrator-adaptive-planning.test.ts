import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Adaptive Planning Enhancement Tests
// Tests: waiting states, plan-aware planner, critic coherence, replanning
// sensitivity, subgoal dependencies, plan objectives, world state hash
// ---------------------------------------------------------------------------

// ===================================================================
// Import actual modules under test
// ===================================================================

import {
  evaluatePlanAction,
  generateSubgoals,
  computePlanProgress,
  computeWorldStateHash,
  type PlanRefreshContext,
} from '@/lib/orchestrator/plan-lifecycle';

import type {
  WorldStateSnapshot,
  OrchestratorPlan,
  OrchestratorSubgoal,
  WaitingOnType,
} from '@/types';

// ===================================================================
// Test helpers
// ===================================================================

function makeWorldState(overrides: Partial<WorldStateSnapshot> = {}): WorldStateSnapshot {
  return {
    entity_type: 'transaction',
    entity_id: 'test-entity-1',
    stage: 'under_contract',
    readiness: 'not_ready',
    completeness_score: 60,
    missing_docs: ['seller_disclosure'],
    missing_signatures: [],
    pending_approvals: 0,
    recent_communications: 0,
    overdue_obligations: 0,
    open_obligations: 1,
    unresolved_exceptions: 0,
    compliance_flags: [],
    urgent_deadlines: [],
    response_latency_signals: [],
    recent_uploads: 0,
    recent_corrections: 0,
    ownership: { owner_id: 'user-1', owner_role: 'agent' },
    assignments: [],
    economics_summary: null,
    health_rating: null,
    health_score: null,
    ...overrides,
  };
}

function makePlan(overrides: Partial<OrchestratorPlan> = {}): OrchestratorPlan {
  return {
    id: 'plan-1',
    orchestrator_id: 'orch-1',
    organization_id: 'org-1',
    title: 'Test plan',
    objective: 'In under_contract stage: collect 1 missing document(s) (2 subgoals).',
    entity_type: 'transaction',
    entity_id: 'test-entity-1',
    status: 'active',
    priority: 'normal',
    priority_rationale: null,
    review_cadence_hours: 24,
    refresh_conditions: ['stage_change', 'document_upload'],
    version: 1,
    superseded_by: null,
    blocked_reason: null,
    blocked_since: null,
    completed_at: null,
    expires_at: null,
    risk_summary: null,
    source_signals: [],
    replan_count: 0,
    last_replan_reason: null,
    world_state_hash: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
    ...overrides,
  };
}

function makeSubgoal(overrides: Partial<OrchestratorSubgoal> = {}): OrchestratorSubgoal {
  return {
    id: 'sg-1',
    plan_id: 'plan-1',
    title: 'Obtain seller_disclosure',
    intent: 'Obtain the missing document.',
    status: 'pending',
    urgency: 'high',
    owner_user_id: 'user-1',
    owner_role: 'agent',
    sort_order: 1,
    prerequisites: [],
    completion_condition: 'Document uploaded and verified.',
    blocked_reason: null,
    blocked_since: null,
    linked_action_ids: [],
    linked_tool_names: ['create_document_request'],
    completed_at: null,
    waiting_on_type: 'seller',
    waiting_on_detail: 'Waiting for seller_disclosure to be uploaded',
    waiting_since: null,
    waiting_expected_event: 'seller_disclosure document uploaded',
    waiting_escalation_hours: 48,
    depends_on_subgoal_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeContext(overrides: Partial<PlanRefreshContext> = {}): PlanRefreshContext {
  return {
    orchestratorId: 'orch-1',
    organizationId: 'org-1',
    entityType: 'transaction',
    entityId: 'test-entity-1',
    currentPlan: null,
    currentSubgoals: [],
    worldState: makeWorldState(),
    unresolvedBlockers: [],
    recentFailures: [],
    deadlines: [],
    waitingStates: [],
    ...overrides,
  };
}

// ===================================================================
// Test Suites
// ===================================================================

describe('Waiting State Semantics', () => {
  it('generateSubgoals assigns waiting_on_type for missing docs', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        missing_docs: ['seller_disclosure', 'lender_commitment_letter', 'title_commitment'],
      }),
    });

    const subgoals = generateSubgoals(ctx);
    const docSubgoals = subgoals.filter(sg => sg.title.startsWith('Obtain '));

    expect(docSubgoals).toHaveLength(3);

    const sellerDoc = docSubgoals.find(sg => sg.title.includes('seller_disclosure'));
    expect(sellerDoc?.waiting_on_type).toBe('seller');

    const lenderDoc = docSubgoals.find(sg => sg.title.includes('lender_commitment'));
    expect(lenderDoc?.waiting_on_type).toBe('lender');

    const titleDoc = docSubgoals.find(sg => sg.title.includes('title_commitment'));
    expect(titleDoc?.waiting_on_type).toBe('title');
  });

  it('generateSubgoals assigns waiting semantics for approvals', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ pending_approvals: 2, missing_docs: [] }),
    });
    const subgoals = generateSubgoals(ctx);
    const approvalSg = subgoals.find(sg => sg.title.includes('pending approval'));

    expect(approvalSg?.waiting_on_type).toBe('approval');
    expect(approvalSg?.waiting_escalation_hours).toBe(24);
    expect(approvalSg?.waiting_expected_event).toBe('Approvals decided');
  });

  it('generateSubgoals assigns compliance_review for compliance flags', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ compliance_flags: ['missing_lead_paint'], missing_docs: [] }),
    });
    const subgoals = generateSubgoals(ctx);
    const complianceSg = subgoals.find(sg => sg.title.includes('compliance'));

    expect(complianceSg?.waiting_on_type).toBe('compliance_review');
    expect(complianceSg?.waiting_escalation_hours).toBe(24);
  });

  it('subgoals for signatures wait on counterparty', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ missing_signatures: ['buyer_agent'], missing_docs: [] }),
    });
    const subgoals = generateSubgoals(ctx);
    const sigSg = subgoals.find(sg => sg.title.includes('signature'));

    expect(sigSg?.waiting_on_type).toBe('counterparty');
    expect(sigSg?.waiting_escalation_hours).toBe(72);
  });

  it('non-waiting subgoals have null waiting fields', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        missing_docs: [],
        completeness_score: 40,
        overdue_obligations: 2,
      }),
    });
    const subgoals = generateSubgoals(ctx);
    const completenessSg = subgoals.find(sg => sg.title === 'Improve completeness');

    expect(completenessSg?.waiting_on_type).toBeNull();
    expect(completenessSg?.waiting_since).toBeNull();
  });
});

describe('Subgoal Dependencies', () => {
  it('generateSubgoals includes depends_on_subgoal_ids field', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ missing_docs: ['seller_disclosure'] }),
    });
    const subgoals = generateSubgoals(ctx);

    for (const sg of subgoals) {
      expect(sg).toHaveProperty('depends_on_subgoal_ids');
      expect(Array.isArray(sg.depends_on_subgoal_ids)).toBe(true);
    }
  });

  it('completeness subgoal notes document dependency in prerequisites', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        missing_docs: ['seller_disclosure'],
        completeness_score: 50,
      }),
    });
    const subgoals = generateSubgoals(ctx);
    const completenessSg = subgoals.find(sg => sg.title === 'Improve completeness');

    expect(completenessSg).toBeDefined();
    expect(completenessSg!.prerequisites.length).toBeGreaterThan(0);
    expect(completenessSg!.prerequisites[0]).toContain('Document');
  });
});

describe('Replanning Sensitivity', () => {
  it('does NOT replan when plan is young and only 1 upload happened', () => {
    const plan = makePlan({
      world_state_hash: 'some-hash',
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      worldState: makeWorldState({ recent_uploads: 1 }),
    });

    const result = evaluatePlanAction(ctx);
    // 1 upload is not significant enough — should continue
    expect(result.action).toBe('continue');
  });

  it('DOES replan when 2+ uploads happened (significant change)', () => {
    const plan = makePlan({
      world_state_hash: 'old-hash',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      worldState: makeWorldState({ recent_uploads: 2 }),
    });

    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('replan');
    expect(result.reason).toContain('uploads');
  });

  it('replans when human corrections occurred', () => {
    const plan = makePlan({
      world_state_hash: 'old-hash',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      worldState: makeWorldState({ recent_corrections: 1 }),
    });

    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('replan');
    expect(result.reason).toContain('correction');
  });

  it('replans when plan is stale (exceeds review cadence)', () => {
    const plan = makePlan({
      review_cadence_hours: 4,
      updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
    });

    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('replan');
    expect(result.reason).toContain('stale');
  });

  it('replans when waiting subgoal exceeds escalation threshold', () => {
    const plan = makePlan({
      world_state_hash: computeWorldStateHash(makeWorldState()),
    });
    const waitingSg = makeSubgoal({
      status: 'waiting',
      waiting_since: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72h ago
      waiting_escalation_hours: 48,
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [waitingSg],
    });

    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('replan');
    expect(result.reason).toContain('escalation threshold');
  });

  it('does NOT replan for waiting subgoals within their threshold', () => {
    const hash = computeWorldStateHash(makeWorldState());
    const plan = makePlan({ world_state_hash: hash });
    const waitingSg = makeSubgoal({
      status: 'waiting',
      waiting_since: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
      waiting_escalation_hours: 48,
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [waitingSg],
    });

    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('continue');
  });

  it('requires 3+ failures to trigger replan (not 2)', () => {
    const hash = computeWorldStateHash(makeWorldState());
    const plan = makePlan({ world_state_hash: hash });

    const ctx2 = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      recentFailures: ['fail1', 'fail2'],
    });
    expect(evaluatePlanAction(ctx2).action).toBe('continue');

    const ctx3 = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      recentFailures: ['fail1', 'fail2', 'fail3'],
    });
    expect(evaluatePlanAction(ctx3).action).toBe('replan');
  });
});

describe('Plan Creation', () => {
  it('creates a plan when no plan exists and work remains', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ missing_docs: ['disclosure'] }),
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('create_plan');
  });

  it('waits when no plan and entity is in terminal stage', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        stage: 'closed',
        missing_docs: [],
        completeness_score: 100,
        open_obligations: 0,
      }),
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('wait');
  });

  it('does not create plan when one already exists', () => {
    const plan = makePlan();
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).not.toBe('create_plan');
  });
});

describe('Plan Completion', () => {
  it('completes plan when entity reaches terminal stage', () => {
    const plan = makePlan();
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      worldState: makeWorldState({ stage: 'closed' }),
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('complete_plan');
    expect(result.reason).toContain('terminal stage');
  });

  it('completes plan when completeness is high and nothing outstanding', () => {
    const plan = makePlan();
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal({ status: 'completed' })],
      worldState: makeWorldState({
        completeness_score: 98,
        missing_docs: [],
        pending_approvals: 0,
        unresolved_exceptions: 0,
        overdue_obligations: 0,
        compliance_flags: [],
        missing_signatures: [],
      }),
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('complete_plan');
  });
});

describe('Plan Blocking', () => {
  it('blocks plan when 3+ unresolved blockers', () => {
    const plan = makePlan();
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      unresolvedBlockers: ['blocker1', 'blocker2', 'blocker3'],
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('block_plan');
    expect(result.reason).toContain('unresolved blockers');
  });

  it('blocks plan with critical deadline and unresolved blockers', () => {
    const plan = makePlan();
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      unresolvedBlockers: ['blocker1'],
      deadlines: [{ description: 'Closing', due_at: '2026-04-05', days_remaining: 1 }],
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('block_plan');
  });
});

describe('World State Hash', () => {
  it('produces consistent hash for same state', () => {
    const ws = makeWorldState();
    const hash1 = computeWorldStateHash(ws);
    const hash2 = computeWorldStateHash(ws);
    expect(hash1).toBe(hash2);
  });

  it('produces different hash when stage changes', () => {
    const ws1 = makeWorldState({ stage: 'under_contract' });
    const ws2 = makeWorldState({ stage: 'closing' });
    expect(computeWorldStateHash(ws1)).not.toBe(computeWorldStateHash(ws2));
  });

  it('produces same hash for small completeness differences (rounds to nearest 10)', () => {
    const ws1 = makeWorldState({ completeness_score: 61 });
    const ws2 = makeWorldState({ completeness_score: 64 });
    expect(computeWorldStateHash(ws1)).toBe(computeWorldStateHash(ws2));
  });

  it('produces different hash when docs change', () => {
    const ws1 = makeWorldState({ missing_docs: ['a'] });
    const ws2 = makeWorldState({ missing_docs: ['a', 'b'] });
    expect(computeWorldStateHash(ws1)).not.toBe(computeWorldStateHash(ws2));
  });

  it('sorts docs for hash stability', () => {
    const ws1 = makeWorldState({ missing_docs: ['b', 'a'] });
    const ws2 = makeWorldState({ missing_docs: ['a', 'b'] });
    expect(computeWorldStateHash(ws1)).toBe(computeWorldStateHash(ws2));
  });
});

describe('Plan Progress Computation', () => {
  it('calculates completion percentage correctly', () => {
    const subgoals: OrchestratorSubgoal[] = [
      makeSubgoal({ id: '1', status: 'completed' }),
      makeSubgoal({ id: '2', status: 'in_progress' }),
      makeSubgoal({ id: '3', status: 'pending' }),
      makeSubgoal({ id: '4', status: 'skipped' }),
    ];
    const progress = computePlanProgress(subgoals);

    expect(progress.total_subgoals).toBe(4);
    expect(progress.completed).toBe(1);
    expect(progress.skipped).toBe(1);
    expect(progress.in_progress).toBe(1);
    expect(progress.pending).toBe(1);
    expect(progress.completion_percentage).toBe(50); // (1 completed + 1 skipped) / 4
  });

  it('returns 0% for empty subgoals', () => {
    const progress = computePlanProgress([]);
    expect(progress.total_subgoals).toBe(0);
    expect(progress.completion_percentage).toBe(0);
  });

  it('returns 100% when all completed or skipped', () => {
    const subgoals: OrchestratorSubgoal[] = [
      makeSubgoal({ id: '1', status: 'completed' }),
      makeSubgoal({ id: '2', status: 'completed' }),
    ];
    expect(computePlanProgress(subgoals).completion_percentage).toBe(100);
  });

  it('counts waiting and blocked separately', () => {
    const subgoals: OrchestratorSubgoal[] = [
      makeSubgoal({ id: '1', status: 'waiting' }),
      makeSubgoal({ id: '2', status: 'blocked' }),
      makeSubgoal({ id: '3', status: 'completed' }),
    ];
    const progress = computePlanProgress(subgoals);
    expect(progress.waiting).toBe(1);
    expect(progress.blocked).toBe(1);
    expect(progress.completion_percentage).toBe(33); // 1/3
  });
});

describe('Plan-Aware Planner (mock output)', () => {
  // These test the mock planner path which is used in tests and local dev
  it('prioritizes subgoal-linked tools when plan exists', async () => {
    // Import the actual planner
    const { runPlanner } = await import('@/lib/orchestrator/planner');

    const ws = makeWorldState({
      missing_docs: ['seller_disclosure'],
      completeness_score: 40,
    });
    const subgoals = [
      makeSubgoal({
        id: 'sg-doc',
        title: 'Obtain seller_disclosure',
        status: 'pending',
        linked_tool_names: ['create_document_request'],
      }),
    ];

    const output = await runPlanner(ws, [], {
      entityType: 'transaction',
      entityId: 'ent-1',
      orgId: 'org-1',
      activePlan: makePlan(),
      activeSubgoals: subgoals,
      planAction: 'continue',
    });

    // Should have an action that references the subgoal
    const docAction = output.proposed_actions.find(
      a => a.tool_name === 'create_document_request',
    );
    expect(docAction).toBeDefined();
    expect(docAction!.reason).toContain('subgoal');
  });

  it('falls back to reactive actions when no subgoals produce actions', async () => {
    const { runPlanner } = await import('@/lib/orchestrator/planner');

    const ws = makeWorldState({
      missing_docs: ['seller_disclosure'],
      completeness_score: 40,
    });

    // All subgoals completed — no plan actions to generate
    const subgoals = [
      makeSubgoal({ status: 'completed' }),
    ];

    const output = await runPlanner(ws, [], {
      entityType: 'transaction',
      entityId: 'ent-1',
      orgId: 'org-1',
      activePlan: makePlan(),
      activeSubgoals: subgoals,
      planAction: 'continue',
    });

    // Should still produce reactive actions since subgoals are done
    expect(output.proposed_actions.length).toBeGreaterThan(0);
  });

  it('respects subgoal dependencies in mock planner', async () => {
    const { runPlanner } = await import('@/lib/orchestrator/planner');

    const ws = makeWorldState({ missing_docs: [], completeness_score: 50 });

    const depSubgoal = makeSubgoal({
      id: 'sg-dep',
      title: 'Obtain lender letter',
      status: 'waiting', // Not completed
      linked_tool_names: ['create_document_request'],
    });

    const dependentSubgoal = makeSubgoal({
      id: 'sg-child',
      title: 'Improve completeness',
      status: 'pending',
      linked_tool_names: ['recompute_completeness'],
      depends_on_subgoal_ids: ['sg-dep'], // Depends on sg-dep
    });

    const output = await runPlanner(ws, [], {
      entityType: 'transaction',
      entityId: 'ent-1',
      orgId: 'org-1',
      activePlan: makePlan(),
      activeSubgoals: [depSubgoal, dependentSubgoal],
      planAction: 'continue',
    });

    // The dependent subgoal should NOT produce an action because dependency not met
    const completenessAction = output.proposed_actions.find(
      a => a.tool_name === 'recompute_completeness' && a.reason.includes('subgoal'),
    );
    expect(completenessAction).toBeUndefined();
  });

  it('includes plan info in reasoning summary when subgoals exist', async () => {
    const { runPlanner } = await import('@/lib/orchestrator/planner');

    const ws = makeWorldState({ missing_docs: ['disclosure'] });

    const output = await runPlanner(ws, [], {
      entityType: 'transaction',
      entityId: 'ent-1',
      orgId: 'org-1',
      activePlan: makePlan(),
      activeSubgoals: [makeSubgoal()],
      planAction: 'continue',
    });

    expect(output.reasoning_summary).toContain('pending subgoal');
  });
});

describe('Critic Plan Coherence (via checkPlanCoherence)', () => {
  // We test the critic's plan coherence indirectly through runCritic
  it('adds concerns for orphaned actions (not linked to plan)', async () => {
    const { runCritic } = await import('@/lib/orchestrator/critic');
    const { registerAllTools } = await import('@/lib/orchestrator/tools');
    registerAllTools();

    const plannerOutput = {
      reasoning_summary: 'test',
      world_state_assessment: 'test',
      blockers_identified: [],
      urgency_assessment: 'normal' as const,
      primary_recommendation: 'test',
      proposed_actions: [
        {
          tool_name: 'create_reminder_draft',
          params: {},
          risk_class: 'medium_risk' as const,
          confidence: 0.8,
          reason: 'Some reason',
          prerequisites: [],
        },
      ],
    };

    const ws = makeWorldState();
    const plan = makePlan();
    const subgoals = [
      makeSubgoal({ linked_tool_names: ['create_document_request'] }),
    ];

    const evaluation = await runCritic(plannerOutput, ws, undefined, {
      activePlan: plan,
      activeSubgoals: subgoals,
    });

    // Should flag the orphaned action
    const allConcerns = evaluation.action_reviews.flatMap(r => r.concerns);
    expect(allConcerns.some(c => c.includes('not linked to any plan subgoal'))).toBe(true);
  });

  it('adds concerns for actions targeting blocked subgoals', async () => {
    const { runCritic } = await import('@/lib/orchestrator/critic');
    const { registerAllTools } = await import('@/lib/orchestrator/tools');
    registerAllTools();

    const plannerOutput = {
      reasoning_summary: 'test',
      world_state_assessment: 'test',
      blockers_identified: [],
      urgency_assessment: 'normal' as const,
      primary_recommendation: 'test',
      proposed_actions: [
        {
          tool_name: 'create_document_request',
          params: {},
          risk_class: 'safe' as const,
          confidence: 0.9,
          reason: 'Request doc',
          prerequisites: [],
        },
      ],
    };

    const ws = makeWorldState();
    const blockedSg = makeSubgoal({
      status: 'blocked',
      blocked_reason: 'Seller unreachable',
      linked_tool_names: ['create_document_request'],
    });

    const evaluation = await runCritic(plannerOutput, ws, undefined, {
      activePlan: makePlan(),
      activeSubgoals: [blockedSg],
    });

    const allConcerns = evaluation.action_reviews.flatMap(r => r.concerns);
    expect(allConcerns.some(c => c.includes('blocked subgoal'))).toBe(true);
  });

  it('requires human review when plan is blocked and non-safe actions proposed', async () => {
    const { runCritic } = await import('@/lib/orchestrator/critic');
    // Register tools so the critic can find them
    const { registerAllTools } = await import('@/lib/orchestrator/tools');
    registerAllTools();

    const plannerOutput = {
      reasoning_summary: 'test',
      world_state_assessment: 'test',
      blockers_identified: [],
      urgency_assessment: 'normal' as const,
      primary_recommendation: 'test',
      proposed_actions: [
        {
          tool_name: 'create_document_request',
          params: {},
          risk_class: 'medium_risk' as const,
          confidence: 0.8,
          reason: 'Request doc',
          prerequisites: [],
        },
      ],
    };

    const ws = makeWorldState();
    const plan = makePlan({ status: 'blocked', blocked_reason: 'Too many blockers' });

    const evaluation = await runCritic(plannerOutput, ws, undefined, {
      activePlan: plan,
      activeSubgoals: [makeSubgoal()],
    });

    expect(evaluation.action_reviews[0].requires_human_review).toBe(true);
  });

  it('flags scope creep when too many actions vs subgoals', async () => {
    const { runCritic } = await import('@/lib/orchestrator/critic');
    const { registerAllTools } = await import('@/lib/orchestrator/tools');
    registerAllTools();

    const plannerOutput = {
      reasoning_summary: 'test',
      world_state_assessment: 'test',
      blockers_identified: [],
      urgency_assessment: 'normal' as const,
      primary_recommendation: 'test',
      proposed_actions: [
        { tool_name: 'recompute_completeness', params: {}, risk_class: 'safe' as const, confidence: 0.9, reason: 'r', prerequisites: [] },
        { tool_name: 'recompute_exceptions', params: {}, risk_class: 'safe' as const, confidence: 0.9, reason: 'r', prerequisites: [] },
        { tool_name: 'create_notification', params: {}, risk_class: 'safe' as const, confidence: 0.9, reason: 'r', prerequisites: [] },
        { tool_name: 'create_document_request', params: {}, risk_class: 'safe' as const, confidence: 0.9, reason: 'r', prerequisites: [] },
      ],
    };

    // Only 1 pending subgoal but 4 actions
    const ws = makeWorldState();
    const evaluation = await runCritic(plannerOutput, ws, undefined, {
      activePlan: makePlan(),
      activeSubgoals: [makeSubgoal({ status: 'pending' })],
    });

    const allConcerns = evaluation.action_reviews.flatMap(r => r.concerns);
    expect(allConcerns.some(c => c.includes('scope creep'))).toBe(true);
  });

  it('works correctly without plan context (backwards compatible)', async () => {
    const { runCritic } = await import('@/lib/orchestrator/critic');
    const { registerAllTools } = await import('@/lib/orchestrator/tools');
    registerAllTools();

    const plannerOutput = {
      reasoning_summary: 'test',
      world_state_assessment: 'test',
      blockers_identified: [],
      urgency_assessment: 'normal' as const,
      primary_recommendation: 'test',
      proposed_actions: [
        { tool_name: 'recompute_completeness', params: {}, risk_class: 'safe' as const, confidence: 0.9, reason: 'r', prerequisites: [] },
      ],
    };

    const ws = makeWorldState();
    // No plan context — should work fine
    const evaluation = await runCritic(plannerOutput, ws);
    expect(evaluation.overall_approval).toBe(true);
  });
});

describe('Subgoal Generation Categories', () => {
  it('generates subgoals for all world state categories', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        missing_docs: ['disclosure'],
        missing_signatures: ['buyer'],
        completeness_score: 30,
        pending_approvals: 1,
        overdue_obligations: 2,
        unresolved_exceptions: 3,
        compliance_flags: ['lead_paint'],
      }),
      deadlines: [{ description: 'Closing', due_at: '2026-04-10', days_remaining: 6 }],
      unresolvedBlockers: ['title defect'],
    });

    const subgoals = generateSubgoals(ctx);

    // Should have: 1 doc + 1 sig + 1 completeness + 1 approval + 1 obligations + 1 exceptions + 1 compliance + 1 deadline + 1 blocker = 9
    expect(subgoals.length).toBe(9);

    // Check each category exists
    expect(subgoals.some(sg => sg.title.startsWith('Obtain '))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('signature'))).toBe(true);
    expect(subgoals.some(sg => sg.title === 'Improve completeness')).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('pending approval'))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('overdue obligation'))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('unresolved exception'))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('compliance'))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('Complete before'))).toBe(true);
    expect(subgoals.some(sg => sg.title.includes('Resolve blocker'))).toBe(true);
  });

  it('sets blockers to blocked status', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ missing_docs: [] }),
      unresolvedBlockers: ['Cannot reach seller'],
    });
    const subgoals = generateSubgoals(ctx);
    const blockerSg = subgoals.find(sg => sg.title.includes('Resolve blocker'));

    expect(blockerSg?.status).toBe('blocked');
    expect(blockerSg?.blocked_reason).toBe('Cannot reach seller');
    expect(blockerSg?.blocked_since).toBeDefined();
  });

  it('assigns critical urgency for very low completeness', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ completeness_score: 30, missing_docs: [] }),
    });
    const subgoals = generateSubgoals(ctx);
    const completenessSg = subgoals.find(sg => sg.title === 'Improve completeness');
    expect(completenessSg?.urgency).toBe('critical');
  });

  it('assigns critical urgency for deadline within 1 day', () => {
    const ctx = makeContext({
      worldState: makeWorldState({ missing_docs: [] }),
      deadlines: [{ description: 'Closing', due_at: '2026-04-05', days_remaining: 1 }],
    });
    const subgoals = generateSubgoals(ctx);
    const deadlineSg = subgoals.find(sg => sg.title.includes('Complete before'));
    expect(deadlineSg?.urgency).toBe('critical');
  });
});

describe('Org Isolation', () => {
  it('plan context is org-scoped in refresh context', () => {
    const ctx1 = makeContext({ organizationId: 'org-1' });
    const ctx2 = makeContext({ organizationId: 'org-2' });

    // Both should create plans independently
    const result1 = evaluatePlanAction(ctx1);
    const result2 = evaluatePlanAction(ctx2);

    expect(result1.action).toBe('create_plan');
    expect(result2.action).toBe('create_plan');
    // Plans are scoped to orchestrator, which is scoped to org
  });
});

describe('Regression Coverage', () => {
  it('existing continue behavior still works', () => {
    const plan = makePlan({
      world_state_hash: computeWorldStateHash(makeWorldState()),
    });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('continue');
  });

  it('wait action returned when no work to do', () => {
    const ctx = makeContext({
      worldState: makeWorldState({
        stage: 'under_contract',
        missing_docs: [],
        completeness_score: 95,
        pending_approvals: 0,
        overdue_obligations: 0,
        open_obligations: 0,
        unresolved_exceptions: 0,
        compliance_flags: [],
        missing_signatures: [],
      }),
    });
    const result = evaluatePlanAction(ctx);
    expect(result.action).toBe('wait');
  });

  it('blocked plans still show in active plan query scope', () => {
    const plan = makePlan({ status: 'blocked', blocked_reason: 'test' });
    const ctx = makeContext({
      currentPlan: plan,
      currentSubgoals: [makeSubgoal()],
      worldState: makeWorldState({ missing_docs: [] }),
    });
    // Should not try to create a new plan (blocked counts as existing)
    const result = evaluatePlanAction(ctx);
    expect(result.action).not.toBe('create_plan');
  });
});
