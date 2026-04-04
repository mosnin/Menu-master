import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Adaptive Planning Layer Tests — pure unit tests.
// No DB calls; all logic tested via local function/type definitions.
// ---------------------------------------------------------------------------

// ===================================================================
// Shared Types
// ===================================================================

type EntityType = 'transaction' | 'listing';
type PlanAction = 'create_plan' | 'continue' | 'replan' | 'block_plan' | 'complete_plan' | 'wait';
type SubgoalStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked' | 'waiting';
type SubgoalCategory = 'missing_doc' | 'completeness' | 'approval' | 'obligation' | 'compliance' | 'deadline';

interface Plan {
  id: string;
  orchestrator_id: string;
  status: 'active' | 'completed' | 'blocked' | 'waiting' | 'superseded';
  created_at: string;
  superseded_by?: string;
  subgoals: Subgoal[];
}

interface Subgoal {
  id: string;
  category: SubgoalCategory;
  description: string;
  status: SubgoalStatus;
  urgency: number; // 0–100, higher = more urgent
  entity_type?: EntityType;
}

interface PlanningWorldState {
  entity_type: EntityType;
  entity_id: string;
  stage: string;
  completeness_score: number;
  missing_docs: string[];
  pending_approvals: number;
  overdue_obligations: number;
  open_obligations: number;
  compliance_flags: string[];
  urgent_deadlines: { description: string; due_at: string; hours_remaining: number }[];
  blockers: { id: string; description: string; has_resolution_path: boolean; waiting_hours: number }[];
}

interface PlanSnapshot {
  active_plan: Plan | null;
  last_world_state: PlanningWorldState | null;
  plan_created_at: string | null;
  review_cadence_hours: number;
}

// ===================================================================
// 1. Plan Action Evaluation
// ===================================================================
describe('Plan Action Evaluation', () => {
  function evaluatePlanAction(
    world: PlanningWorldState,
    snapshot: PlanSnapshot,
    now: Date = new Date(),
  ): PlanAction {
    // Closed/cancelled entities never get new plans
    if (['closed', 'cancelled', 'withdrawn'].includes(world.stage)) {
      if (snapshot.active_plan) {
        // If all subgoals are done, complete it
        const allDone = snapshot.active_plan.subgoals.every(
          (s) => s.status === 'completed' || s.status === 'skipped',
        );
        if (allDone) return 'complete_plan';
        return 'continue';
      }
      return 'wait';
    }

    // Complete if all subgoals done
    if (snapshot.active_plan) {
      const allDone = snapshot.active_plan.subgoals.every(
        (s) => s.status === 'completed' || s.status === 'skipped',
      );
      if (allDone) return 'complete_plan';
    }

    // Block detection
    const unresolvedBlockers = world.blockers.filter((b) => !b.has_resolution_path);
    if (unresolvedBlockers.length >= 3) return 'block_plan';
    const longWaiters = world.blockers.filter((b) => b.waiting_hours > 72);
    if (longWaiters.length > 0) return 'block_plan';

    // No active plan — decide whether to create
    if (!snapshot.active_plan) {
      if (world.missing_docs.length > 0) return 'create_plan';
      if (world.completeness_score < 50) return 'create_plan';
      return 'wait';
    }

    // Waiting state with no trigger
    if (snapshot.active_plan.status === 'waiting') {
      const hasTrigger =
        world.missing_docs.length !== (snapshot.last_world_state?.missing_docs.length ?? 0) ||
        world.completeness_score !== (snapshot.last_world_state?.completeness_score ?? 0) ||
        world.pending_approvals !== (snapshot.last_world_state?.pending_approvals ?? 0) ||
        world.stage !== (snapshot.last_world_state?.stage ?? '');
      if (!hasTrigger) return 'wait';
    }

    // Replan triggers
    if (snapshot.last_world_state) {
      const scoreDelta = Math.abs(world.completeness_score - snapshot.last_world_state.completeness_score);
      if (scoreDelta > 10) return 'replan';
      if (world.missing_docs.length !== snapshot.last_world_state.missing_docs.length) return 'replan';
      if (world.pending_approvals !== snapshot.last_world_state.pending_approvals) return 'replan';
      if (world.compliance_flags.length !== snapshot.last_world_state.compliance_flags.length) return 'replan';
      if (world.stage !== snapshot.last_world_state.stage) return 'replan';
    }

    // Stale plan check
    if (snapshot.plan_created_at) {
      const ageMs = now.getTime() - new Date(snapshot.plan_created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours > snapshot.review_cadence_hours) return 'replan';
    }

    // Blocked subgoal > 24 hours (approximated by any blocker > 24h)
    const stuckBlockers = world.blockers.filter((b) => b.waiting_hours > 24);
    if (stuckBlockers.length > 0) return 'replan';

    return 'continue';
  }

  // Helpers
  function makeWorld(overrides: Partial<PlanningWorldState> = {}): PlanningWorldState {
    return {
      entity_type: 'transaction',
      entity_id: 'e1',
      stage: 'active',
      completeness_score: 70,
      missing_docs: [],
      pending_approvals: 0,
      overdue_obligations: 0,
      open_obligations: 0,
      compliance_flags: [],
      urgent_deadlines: [],
      blockers: [],
      ...overrides,
    };
  }

  function makeSnapshot(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
    return {
      active_plan: null,
      last_world_state: null,
      plan_created_at: null,
      review_cadence_hours: 48,
      ...overrides,
    };
  }

  function makePlan(overrides: Partial<Plan> = {}): Plan {
    return {
      id: 'plan-1',
      orchestrator_id: 'orch-1',
      status: 'active',
      created_at: new Date().toISOString(),
      subgoals: [
        { id: 'sg1', category: 'missing_doc', description: 'Get disclosure', status: 'in_progress', urgency: 50 },
      ],
      ...overrides,
    };
  }

  it('create_plan when no active plan and missing docs exist', () => {
    const world = makeWorld({ missing_docs: ['disclosure', 'inspection'] });
    const snap = makeSnapshot();
    expect(evaluatePlanAction(world, snap)).toBe('create_plan');
  });

  it('create_plan when no active plan and completeness below 50', () => {
    const world = makeWorld({ completeness_score: 35 });
    const snap = makeSnapshot();
    expect(evaluatePlanAction(world, snap)).toBe('create_plan');
  });

  it('continue when active plan exists and no material changes', () => {
    const world = makeWorld();
    const plan = makePlan();
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: { ...makeWorld() },
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('continue');
  });

  it('replan when world state changed materially', () => {
    const world = makeWorld({ completeness_score: 85 });
    const plan = makePlan();
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld({ completeness_score: 70 }),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('replan');
  });

  it('replan when plan is stale (older than review cadence)', () => {
    const world = makeWorld();
    const plan = makePlan();
    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(); // 72h ago
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld(),
      plan_created_at: staleDate,
      review_cadence_hours: 48,
    });
    expect(evaluatePlanAction(world, snap)).toBe('replan');
  });

  it('replan when a subgoal blocked for > 24 hours', () => {
    const world = makeWorld({
      blockers: [{ id: 'b1', description: 'Waiting on title company', has_resolution_path: true, waiting_hours: 30 }],
    });
    const plan = makePlan();
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld({
        blockers: [{ id: 'b1', description: 'Waiting on title company', has_resolution_path: true, waiting_hours: 30 }],
      }),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('replan');
  });

  it('block_plan when multiple blockers with no resolution', () => {
    const blockers = [
      { id: 'b1', description: 'No response from seller', has_resolution_path: false, waiting_hours: 10 },
      { id: 'b2', description: 'Title issue', has_resolution_path: false, waiting_hours: 12 },
      { id: 'b3', description: 'Lender delay', has_resolution_path: false, waiting_hours: 8 },
    ];
    const world = makeWorld({ blockers });
    const snap = makeSnapshot({ active_plan: makePlan(), last_world_state: makeWorld({ blockers }), plan_created_at: new Date().toISOString() });
    expect(evaluatePlanAction(world, snap)).toBe('block_plan');
  });

  it('block_plan when waiting > 72 hours on external input', () => {
    const world = makeWorld({
      blockers: [{ id: 'b1', description: 'Waiting on county', has_resolution_path: true, waiting_hours: 80 }],
    });
    const snap = makeSnapshot({
      active_plan: makePlan(),
      last_world_state: makeWorld({
        blockers: [{ id: 'b1', description: 'Waiting on county', has_resolution_path: true, waiting_hours: 80 }],
      }),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('block_plan');
  });

  it('complete_plan when all subgoals are completed', () => {
    const plan = makePlan({
      subgoals: [
        { id: 'sg1', category: 'missing_doc', description: 'Got disclosure', status: 'completed', urgency: 50 },
        { id: 'sg2', category: 'approval', description: 'Approval done', status: 'completed', urgency: 30 },
      ],
    });
    const world = makeWorld();
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld(),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('complete_plan');
  });

  it('complete_plan when entity reached terminal stage (closed)', () => {
    const plan = makePlan({
      subgoals: [
        { id: 'sg1', category: 'missing_doc', description: 'Done', status: 'completed', urgency: 50 },
        { id: 'sg2', category: 'compliance', description: 'Cleared', status: 'skipped', urgency: 20 },
      ],
    });
    const world = makeWorld({ stage: 'closed' });
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld({ stage: 'closed' }),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('complete_plan');
  });

  it('wait when plan is in waiting state and no trigger', () => {
    const plan = makePlan({ status: 'waiting' });
    const world = makeWorld();
    const snap = makeSnapshot({
      active_plan: plan,
      last_world_state: makeWorld(),
      plan_created_at: new Date().toISOString(),
    });
    expect(evaluatePlanAction(world, snap)).toBe('wait');
  });

  it('does not create plan on closed/cancelled entity', () => {
    const world = makeWorld({ stage: 'cancelled' });
    const snap = makeSnapshot();
    expect(evaluatePlanAction(world, snap)).toBe('wait');
  });
});

// ===================================================================
// 2. Subgoal Generation
// ===================================================================
describe('Subgoal Generation', () => {
  function generateSubgoals(world: PlanningWorldState): Subgoal[] {
    const subgoals: Subgoal[] = [];
    const seen = new Set<string>();

    function add(sg: Omit<Subgoal, 'id' | 'status'>) {
      const key = `${sg.category}:${sg.description}`;
      if (seen.has(key)) return;
      seen.add(key);
      subgoals.push({ ...sg, id: `sg-${subgoals.length + 1}`, status: 'pending' });
    }

    // Missing documents
    for (const doc of world.missing_docs) {
      add({ category: 'missing_doc', description: `Obtain missing document: ${doc}`, urgency: 60, entity_type: world.entity_type });
    }

    // Completeness
    if (world.completeness_score < 50) {
      add({ category: 'completeness', description: 'Improve completeness score above 50%', urgency: 70, entity_type: world.entity_type });
    }

    // Pending approvals
    if (world.pending_approvals > 0) {
      for (let i = 0; i < world.pending_approvals; i++) {
        add({ category: 'approval', description: `Resolve pending approval ${i + 1}`, urgency: 55, entity_type: world.entity_type });
      }
    }

    // Overdue obligations
    if (world.overdue_obligations > 0) {
      for (let i = 0; i < world.overdue_obligations; i++) {
        add({ category: 'obligation', description: `Address overdue obligation ${i + 1}`, urgency: 80, entity_type: world.entity_type });
      }
    }

    // Compliance flags
    for (const flag of world.compliance_flags) {
      add({ category: 'compliance', description: `Resolve compliance flag: ${flag}`, urgency: 75, entity_type: world.entity_type });
    }

    // Approaching deadlines
    for (const dl of world.urgent_deadlines) {
      add({ category: 'deadline', description: `Address deadline: ${dl.description}`, urgency: Math.min(100, Math.max(0, 100 - dl.hours_remaining)), entity_type: world.entity_type });
    }

    // Entity-type-specific subgoals
    if (world.entity_type === 'listing' && world.missing_docs.length === 0 && world.completeness_score >= 50) {
      add({ category: 'completeness', description: 'Review listing marketing readiness', urgency: 30, entity_type: 'listing' });
    }
    if (world.entity_type === 'transaction' && world.missing_docs.length === 0 && world.completeness_score >= 50) {
      add({ category: 'completeness', description: 'Verify transaction closing prerequisites', urgency: 35, entity_type: 'transaction' });
    }

    // Sort by urgency descending
    subgoals.sort((a, b) => b.urgency - a.urgency);

    // Cap at 10
    return subgoals.slice(0, 10);
  }

  function makeWorld(overrides: Partial<PlanningWorldState> = {}): PlanningWorldState {
    return {
      entity_type: 'transaction',
      entity_id: 'e1',
      stage: 'active',
      completeness_score: 70,
      missing_docs: [],
      pending_approvals: 0,
      overdue_obligations: 0,
      open_obligations: 0,
      compliance_flags: [],
      urgent_deadlines: [],
      blockers: [],
      ...overrides,
    };
  }

  it('generates subgoal for each missing document', () => {
    const world = makeWorld({ missing_docs: ['disclosure', 'title_report', 'inspection'] });
    const result = generateSubgoals(world);
    const docGoals = result.filter((s) => s.category === 'missing_doc');
    expect(docGoals).toHaveLength(3);
    expect(docGoals[0].description).toContain('disclosure');
  });

  it('generates completeness improvement subgoal when score < 50', () => {
    const world = makeWorld({ completeness_score: 30 });
    const result = generateSubgoals(world);
    const compGoals = result.filter((s) => s.category === 'completeness' && s.description.includes('Improve'));
    expect(compGoals).toHaveLength(1);
  });

  it('generates approval resolution subgoals for pending approvals', () => {
    const world = makeWorld({ pending_approvals: 3 });
    const result = generateSubgoals(world);
    const approvalGoals = result.filter((s) => s.category === 'approval');
    expect(approvalGoals).toHaveLength(3);
  });

  it('generates overdue obligation subgoals', () => {
    const world = makeWorld({ overdue_obligations: 2 });
    const result = generateSubgoals(world);
    const oblGoals = result.filter((s) => s.category === 'obligation');
    expect(oblGoals).toHaveLength(2);
    expect(oblGoals[0].urgency).toBe(80);
  });

  it('generates compliance subgoals for active flags', () => {
    const world = makeWorld({ compliance_flags: ['wire_fraud_risk', 'missing_disclosure'] });
    const result = generateSubgoals(world);
    const complianceGoals = result.filter((s) => s.category === 'compliance');
    expect(complianceGoals).toHaveLength(2);
    expect(complianceGoals[0].description).toContain('wire_fraud_risk');
  });

  it('generates deadline subgoals for approaching deadlines', () => {
    const world = makeWorld({
      urgent_deadlines: [
        { description: 'Closing in 12h', due_at: '2026-04-05T00:00:00Z', hours_remaining: 12 },
      ],
    });
    const result = generateSubgoals(world);
    const dlGoals = result.filter((s) => s.category === 'deadline');
    expect(dlGoals).toHaveLength(1);
    expect(dlGoals[0].urgency).toBe(88); // 100 - 12
  });

  it('orders subgoals by urgency', () => {
    const world = makeWorld({
      missing_docs: ['disclosure'], // urgency 60
      overdue_obligations: 1,       // urgency 80
      compliance_flags: ['flag1'],  // urgency 75
    });
    const result = generateSubgoals(world);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].urgency).toBeLessThanOrEqual(result[i - 1].urgency);
    }
  });

  it('does not generate duplicate subgoals', () => {
    // Provide the same doc name twice (edge case from deduplication)
    const world = makeWorld({ missing_docs: ['disclosure', 'disclosure'] });
    const result = generateSubgoals(world);
    const docGoals = result.filter((s) => s.category === 'missing_doc');
    expect(docGoals).toHaveLength(1);
  });

  it('caps subgoals at reasonable limit (max 10)', () => {
    const world = makeWorld({
      missing_docs: ['d1', 'd2', 'd3', 'd4', 'd5'],
      pending_approvals: 3,
      overdue_obligations: 2,
      compliance_flags: ['f1', 'f2'],
      urgent_deadlines: [{ description: 'Closing', due_at: '2026-04-05', hours_remaining: 6 }],
    });
    const result = generateSubgoals(world);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('generates different subgoals for listings vs transactions', () => {
    const listingWorld = makeWorld({ entity_type: 'listing' });
    const txWorld = makeWorld({ entity_type: 'transaction' });
    const listingGoals = generateSubgoals(listingWorld);
    const txGoals = generateSubgoals(txWorld);
    const listingDescriptions = listingGoals.map((s) => s.description);
    const txDescriptions = txGoals.map((s) => s.description);
    expect(listingDescriptions).toContain('Review listing marketing readiness');
    expect(txDescriptions).toContain('Verify transaction closing prerequisites');
    expect(listingDescriptions).not.toContain('Verify transaction closing prerequisites');
  });
});

// ===================================================================
// 3. Plan Progress Computation
// ===================================================================
describe('Plan Progress Computation', () => {
  function computeProgress(subgoals: Subgoal[]): number {
    if (subgoals.length === 0) return 0;
    const completed = subgoals.filter((s) => s.status === 'completed').length;
    const skipped = subgoals.filter((s) => s.status === 'skipped').length;
    const total = subgoals.length;
    return Math.round(((completed + skipped) / total) * 100);
  }

  function sg(status: SubgoalStatus): Subgoal {
    return { id: 'sg', category: 'missing_doc', description: 'test', status, urgency: 50 };
  }

  it('returns 0% when no subgoals completed', () => {
    expect(computeProgress([sg('pending'), sg('in_progress')])).toBe(0);
  });

  it('returns 100% when all completed', () => {
    expect(computeProgress([sg('completed'), sg('completed'), sg('completed')])).toBe(100);
  });

  it('handles mix of completed and skipped', () => {
    expect(computeProgress([sg('completed'), sg('skipped'), sg('pending'), sg('in_progress')])).toBe(50);
  });

  it('blocked subgoals do not count as progress', () => {
    expect(computeProgress([sg('completed'), sg('blocked')])).toBe(50);
  });

  it('waiting subgoals do not count as progress', () => {
    expect(computeProgress([sg('completed'), sg('waiting'), sg('pending')])).toBe(33);
  });

  it('empty subgoal list returns 0%', () => {
    expect(computeProgress([])).toBe(0);
  });

  it('counts each status correctly', () => {
    const list = [
      sg('completed'),
      sg('completed'),
      sg('skipped'),
      sg('blocked'),
      sg('waiting'),
      sg('pending'),
      sg('in_progress'),
    ];
    // 2 completed + 1 skipped = 3 out of 7
    expect(computeProgress(list)).toBe(43); // Math.round(3/7*100)
  });

  it('percentage is rounded to nearest integer', () => {
    // 1 out of 3 = 33.333... -> 33
    expect(computeProgress([sg('completed'), sg('pending'), sg('pending')])).toBe(33);
    // 2 out of 3 = 66.666... -> 67
    expect(computeProgress([sg('completed'), sg('completed'), sg('pending')])).toBe(67);
  });
});

// ===================================================================
// 4. Replan Detection
// ===================================================================
describe('Replan Detection', () => {
  function shouldReplan(
    current: PlanningWorldState,
    previous: PlanningWorldState,
    planCreatedAt: string,
    reviewCadenceHours: number,
    now: Date = new Date(),
  ): boolean {
    // Plan age check
    const ageMs = now.getTime() - new Date(planCreatedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Just-created plans (< 1 hour) are never replanned
    if (ageHours < 1) return false;

    // Stale plan
    if (ageHours > reviewCadenceHours) return true;

    // Completeness score changed by > 10 points
    if (Math.abs(current.completeness_score - previous.completeness_score) > 10) return true;

    // New document arrived (missing docs decreased)
    if (current.missing_docs.length !== previous.missing_docs.length) return true;

    // Approval status changed
    if (current.pending_approvals !== previous.pending_approvals) return true;

    // New compliance flag
    if (current.compliance_flags.length > previous.compliance_flags.length) return true;

    // Stage changed
    if (current.stage !== previous.stage) return true;

    return false;
  }

  function makeWorld(overrides: Partial<PlanningWorldState> = {}): PlanningWorldState {
    return {
      entity_type: 'transaction',
      entity_id: 'e1',
      stage: 'active',
      completeness_score: 70,
      missing_docs: ['disclosure'],
      pending_approvals: 1,
      overdue_obligations: 0,
      open_obligations: 0,
      compliance_flags: [],
      urgent_deadlines: [],
      blockers: [],
      ...overrides,
    };
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  it('replans when completeness score changed by > 10 points', () => {
    const prev = makeWorld({ completeness_score: 60 });
    const curr = makeWorld({ completeness_score: 75 });
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(true);
  });

  it('replans when new document arrived', () => {
    const prev = makeWorld({ missing_docs: ['disclosure', 'inspection'] });
    const curr = makeWorld({ missing_docs: ['disclosure'] }); // one doc arrived
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(true);
  });

  it('replans when approval status changed', () => {
    const prev = makeWorld({ pending_approvals: 2 });
    const curr = makeWorld({ pending_approvals: 1 });
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(true);
  });

  it('replans when new compliance flag appeared', () => {
    const prev = makeWorld({ compliance_flags: [] });
    const curr = makeWorld({ compliance_flags: ['wire_fraud_risk'] });
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(true);
  });

  it('does not replan on minor changes', () => {
    const prev = makeWorld({ completeness_score: 70 });
    const curr = makeWorld({ completeness_score: 73 }); // only 3 point change
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(false);
  });

  it('replans when plan older than review cadence', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(shouldReplan(curr, prev, oldDate, 48)).toBe(true);
  });

  it('does not replan if plan was just created', () => {
    const prev = makeWorld({ completeness_score: 50 });
    const curr = makeWorld({ completeness_score: 80 }); // big change but plan is brand new
    expect(shouldReplan(curr, prev, fiveMinutesAgo, 48)).toBe(false);
  });

  it('replans when stage changed', () => {
    const prev = makeWorld({ stage: 'active' });
    const curr = makeWorld({ stage: 'under_contract' });
    expect(shouldReplan(curr, prev, twoHoursAgo, 48)).toBe(true);
  });
});

// ===================================================================
// 5. Blocked Plan Detection
// ===================================================================
describe('Blocked Plan Detection', () => {
  interface Blocker {
    id: string;
    description: string;
    has_resolution_path: boolean;
    waiting_hours: number;
    is_critical_deadline: boolean;
    hours_to_deadline?: number;
  }

  function shouldBlockPlan(blockers: Blocker[]): boolean {
    // Unblocks when no blockers remain
    if (blockers.length === 0) return false;

    // 3+ unresolved blockers
    const unresolved = blockers.filter((b) => !b.has_resolution_path);
    if (unresolved.length >= 3) return true;

    // Waiting on external > 72 hours
    const longWaiters = blockers.filter((b) => b.waiting_hours > 72);
    if (longWaiters.length > 0) return true;

    // Critical deadline within 24h AND there are blockers
    const criticalSoon = blockers.filter(
      (b) => b.is_critical_deadline && b.hours_to_deadline !== undefined && b.hours_to_deadline < 24,
    );
    if (criticalSoon.length > 0 && blockers.length > 0) return true;

    // Only 1 blocker with resolution path is not enough to block
    if (blockers.length <= 1 && blockers.every((b) => b.has_resolution_path)) return false;

    // Blockers all have resolution paths — don't block
    if (blockers.every((b) => b.has_resolution_path)) return false;

    return false;
  }

  it('blocks when 3+ unresolved blockers', () => {
    const blockers: Blocker[] = [
      { id: 'b1', description: 'No response', has_resolution_path: false, waiting_hours: 10, is_critical_deadline: false },
      { id: 'b2', description: 'Title issue', has_resolution_path: false, waiting_hours: 12, is_critical_deadline: false },
      { id: 'b3', description: 'Lender delay', has_resolution_path: false, waiting_hours: 5, is_critical_deadline: false },
    ];
    expect(shouldBlockPlan(blockers)).toBe(true);
  });

  it('blocks when waiting on external > 72 hours', () => {
    const blockers: Blocker[] = [
      { id: 'b1', description: 'County records', has_resolution_path: true, waiting_hours: 80, is_critical_deadline: false },
    ];
    expect(shouldBlockPlan(blockers)).toBe(true);
  });

  it('blocks when critical deadline within 24h with blockers', () => {
    const blockers: Blocker[] = [
      { id: 'b1', description: 'Closing tomorrow', has_resolution_path: true, waiting_hours: 5, is_critical_deadline: true, hours_to_deadline: 18 },
    ];
    expect(shouldBlockPlan(blockers)).toBe(true);
  });

  it('does not block with only 1 blocker', () => {
    const blockers: Blocker[] = [
      { id: 'b1', description: 'Minor issue', has_resolution_path: true, waiting_hours: 10, is_critical_deadline: false },
    ];
    expect(shouldBlockPlan(blockers)).toBe(false);
  });

  it('does not block when blockers have resolution path', () => {
    const blockers: Blocker[] = [
      { id: 'b1', description: 'Issue A', has_resolution_path: true, waiting_hours: 10, is_critical_deadline: false },
      { id: 'b2', description: 'Issue B', has_resolution_path: true, waiting_hours: 15, is_critical_deadline: false },
    ];
    expect(shouldBlockPlan(blockers)).toBe(false);
  });

  it('unblocks when blockers resolve', () => {
    expect(shouldBlockPlan([])).toBe(false);
  });
});

// ===================================================================
// 6. Plan Supersession
// ===================================================================
describe('Plan Supersession', () => {
  interface PlanStore {
    plans: Plan[];
  }

  function createPlan(store: PlanStore, orchestratorId: string, subgoals: Subgoal[]): Plan {
    // Supersede any active plan for this orchestrator
    for (const plan of store.plans) {
      if (plan.orchestrator_id === orchestratorId && plan.status === 'active') {
        plan.status = 'superseded';
        plan.superseded_by = `plan-${store.plans.length + 1}`;
      }
    }

    const newPlan: Plan = {
      id: `plan-${store.plans.length + 1}`,
      orchestrator_id: orchestratorId,
      status: 'active',
      created_at: new Date().toISOString(),
      subgoals,
    };
    store.plans.push(newPlan);
    return newPlan;
  }

  function sg(): Subgoal {
    return { id: 'sg1', category: 'missing_doc', description: 'test', status: 'pending', urgency: 50 };
  }

  it('only one active plan per orchestrator', () => {
    const store: PlanStore = { plans: [] };
    createPlan(store, 'orch-1', [sg()]);
    createPlan(store, 'orch-1', [sg()]);
    createPlan(store, 'orch-1', [sg()]);
    const activePlans = store.plans.filter((p) => p.orchestrator_id === 'orch-1' && p.status === 'active');
    expect(activePlans).toHaveLength(1);
  });

  it('old plan marked superseded when new plan created', () => {
    const store: PlanStore = { plans: [] };
    const first = createPlan(store, 'orch-1', [sg()]);
    createPlan(store, 'orch-1', [sg()]);
    const oldPlan = store.plans.find((p) => p.id === first.id)!;
    expect(oldPlan.status).toBe('superseded');
  });

  it('superseded plan records the new plan id', () => {
    const store: PlanStore = { plans: [] };
    const first = createPlan(store, 'orch-1', [sg()]);
    const second = createPlan(store, 'orch-1', [sg()]);
    const oldPlan = store.plans.find((p) => p.id === first.id)!;
    expect(oldPlan.superseded_by).toBe(second.id);
  });

  it('completed plans are not superseded', () => {
    const store: PlanStore = { plans: [] };
    const first = createPlan(store, 'orch-1', [sg()]);
    // Mark the first plan as completed
    first.status = 'completed';
    const second = createPlan(store, 'orch-1', [sg()]);
    const completedPlan = store.plans.find((p) => p.id === first.id)!;
    expect(completedPlan.status).toBe('completed');
    expect(completedPlan.superseded_by).toBeUndefined();
    expect(second.status).toBe('active');
  });
});
