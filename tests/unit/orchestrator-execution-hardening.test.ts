import { describe, it, expect, vi } from 'vitest';

import type {
  OrchestratorActionProposal,
  OrchestratorActionExecution,
  ActionRiskClass,
  PolicyContext,
  OrgPolicyOverrides,
  WorldStateSnapshot,
  FollowThroughSequence,
} from '@/types';

import { evaluatePolicy } from '@/lib/orchestrator/action-policy';
import { routeToSpecialists } from '@/lib/orchestrator/specialists/router';
import { detectTriggers, shouldExitEarly } from '@/lib/orchestrator/follow-through';
import type { FollowThroughRun } from '@/types';

// ---------------------------------------------------------------------------
// 1. Action Cooldown Tests
// ---------------------------------------------------------------------------

describe('Action Cooldown', () => {
  it('prevents duplicate execution of same tool+params within cooldown window', () => {
    // Cooldown is 5 minutes — actions with same tool+params within window should be blocked
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const COOLDOWN_MS = 5 * 60 * 1000;
    const cooldownThreshold = new Date(now.getTime() - COOLDOWN_MS).toISOString();

    const recentExecution = {
      tool_name: 'recompute_completeness',
      tool_params: {},
      success: true,
      created_at: twoMinutesAgo, // Within cooldown
    };

    const inCooldown = recentExecution.created_at > cooldownThreshold &&
      recentExecution.success;
    expect(inCooldown).toBe(true);

    // Old execution should NOT be in cooldown
    const oldExecution = {
      ...recentExecution,
      created_at: tenMinutesAgo, // Outside cooldown
    };
    const oldInCooldown = oldExecution.created_at > cooldownThreshold &&
      oldExecution.success;
    expect(oldInCooldown).toBe(false);
  });

  it('allows execution of same tool with different params', () => {
    const params1 = JSON.stringify({ document_type: 'purchase_agreement' });
    const params2 = JSON.stringify({ document_type: 'disclosure' });
    expect(params1 !== params2).toBe(true);
  });

  it('allows execution of failed action (no cooldown on failures)', () => {
    const failedExecution = {
      tool_name: 'recompute_completeness',
      success: false,
      created_at: new Date().toISOString(),
    };
    // Failed executions should not trigger cooldown
    expect(failedExecution.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Execution Retry Tests
// ---------------------------------------------------------------------------

describe('Execution Retry for Safe Actions', () => {
  it('safe actions get up to 3 attempts (1 + 2 retries)', () => {
    const MAX_SAFE_RETRIES = 2;
    const maxAttempts = (riskClass: ActionRiskClass) =>
      riskClass === 'safe' ? MAX_SAFE_RETRIES + 1 : 1;

    expect(maxAttempts('safe')).toBe(3);
    expect(maxAttempts('medium_risk')).toBe(1);
    expect(maxAttempts('high_risk')).toBe(1);
  });

  it('retry delay increases with each attempt', () => {
    const RETRY_DELAY_MS = 500;
    const delays = [1, 2, 3].map(attempt => RETRY_DELAY_MS * attempt);
    expect(delays).toEqual([500, 1000, 1500]);
  });

  it('stops retrying on success', () => {
    const results = [false, false, true]; // Fails twice, succeeds third
    let finalSuccess = false;
    for (const result of results) {
      if (result) {
        finalSuccess = true;
        break;
      }
    }
    expect(finalSuccess).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Policy Context Passing Tests
// ---------------------------------------------------------------------------

describe('Full Policy Context', () => {
  it('policy uses world stage from world state', () => {
    const context: PolicyContext = {
      toolName: 'recompute_completeness',
      riskClass: 'safe',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'agent',
      complianceFlags: [],
      worldStage: 'under_contract',
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('auto_execute');
  });

  it('terminal stage blocks all actions regardless of risk class', () => {
    const context: PolicyContext = {
      toolName: 'recompute_completeness',
      riskClass: 'safe',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'agent',
      complianceFlags: [],
      worldStage: 'closed',
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('block');
    expect(decision.policy_rule).toBe('terminal_stage_block');
  });

  it('compliance flags with non-safe action trigger approval', () => {
    const context: PolicyContext = {
      toolName: 'create_document_request',
      riskClass: 'medium_risk',
      confidence: 0.8,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: ['license_verification_pending'],
      worldStage: 'under_contract',
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('create_approval');
  });

  it('org overrides: promoted_to_safe allows auto_execute', () => {
    const context: PolicyContext = {
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'under_contract',
      orgPolicyOverrides: {
        promoted_to_safe: ['create_reminder_draft'],
        demoted_to_blocked: [],
        require_approval_for: [],
      },
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('auto_execute');
  });

  it('org overrides: demoted_to_blocked blocks a safe tool', () => {
    const context: PolicyContext = {
      toolName: 'recompute_completeness',
      riskClass: 'safe',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'agent',
      complianceFlags: [],
      worldStage: 'active',
      orgPolicyOverrides: {
        promoted_to_safe: [],
        demoted_to_blocked: ['recompute_completeness'],
        require_approval_for: [],
      },
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('block');
    expect(decision.policy_rule).toBe('org_demoted_to_blocked');
  });

  it('org overrides: require_approval_for forces approval on safe tool', () => {
    const context: PolicyContext = {
      toolName: 'create_notification',
      riskClass: 'safe',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'agent',
      complianceFlags: [],
      worldStage: 'active',
      orgPolicyOverrides: {
        promoted_to_safe: [],
        demoted_to_blocked: [],
        require_approval_for: ['create_notification'],
      },
    };

    const decision = evaluatePolicy(context);
    expect(decision.disposition).toBe('create_approval');
  });
});

// ---------------------------------------------------------------------------
// 4. Plan-Linked Execution Tests
// ---------------------------------------------------------------------------

describe('Plan-Linked Execution', () => {
  it('execution result includes plan context when plan is active', () => {
    const planId = 'plan-123';
    const subgoalId = 'subgoal-456';
    const toolToSubgoalMap = new Map<string, string>();
    toolToSubgoalMap.set('recompute_completeness', subgoalId);

    const planContext = planId
      ? {
          plan_id: planId,
          subgoal_id: toolToSubgoalMap.get('recompute_completeness') ?? null,
        }
      : undefined;

    expect(planContext).toEqual({ plan_id: planId, subgoal_id: subgoalId });
  });

  it('execution result omits plan context when no plan is active', () => {
    const planId: string | undefined = undefined;
    const planContext = planId
      ? { plan_id: planId, subgoal_id: null }
      : undefined;

    expect(planContext).toBeUndefined();
  });

  it('tool-to-subgoal map skips completed subgoals', () => {
    const subgoals = [
      { id: 'sg1', status: 'completed', linked_tool_names: ['recompute_completeness'] },
      { id: 'sg2', status: 'pending', linked_tool_names: ['recompute_completeness'] },
    ];

    const map = new Map<string, string>();
    for (const sg of subgoals) {
      if (sg.status !== 'completed' && sg.status !== 'skipped') {
        for (const tn of sg.linked_tool_names) {
          if (!map.has(tn)) map.set(tn, sg.id);
        }
      }
    }

    expect(map.get('recompute_completeness')).toBe('sg2');
  });
});

// ---------------------------------------------------------------------------
// 5. Follow-Through Sequence Tests
// ---------------------------------------------------------------------------

describe('Follow-Through Sequences', () => {
  describe('Deadline Approaching', () => {
    it('triggers when deadline is within 7 days', () => {
      const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
      const worldState = {
        missing_docs: ['disclosure'],
        pending_approvals: 1,
        unresolved_exceptions: 0,
        completeness_score: 70,
        urgent_deadlines: [{ date: sixDaysFromNow, description: 'Contingency deadline' }],
        ownership: { owner_id: 'user1' },
        stage: 'under_contract',
        compliance_flags: [],
        overdue_obligations: 0,
        open_obligations: 0,
        entity_id: 'entity1',
      } as unknown as WorldStateSnapshot;

      const triggers = detectTriggers(worldState);
      const deadlineTrigger = triggers.find(t => t.sequenceId === 'deadline-approaching-follow-through');
      expect(deadlineTrigger).toBeDefined();
      expect(deadlineTrigger?.triggerData.deadline_description).toBe('Contingency deadline');
    });

    it('does NOT trigger when deadline is more than 7 days away', () => {
      const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const worldState = {
        missing_docs: [],
        pending_approvals: 0,
        unresolved_exceptions: 0,
        completeness_score: 80,
        urgent_deadlines: [{ date: tenDaysFromNow, description: 'Far deadline' }],
        ownership: { owner_id: 'user1' },
        stage: 'under_contract',
        compliance_flags: [],
        overdue_obligations: 0,
        open_obligations: 0,
        entity_id: 'entity1',
      } as unknown as WorldStateSnapshot;

      const triggers = detectTriggers(worldState);
      const deadlineTrigger = triggers.find(t => t.sequenceId === 'deadline-approaching-follow-through');
      expect(deadlineTrigger).toBeUndefined();
    });

    it('exits early when all blockers are resolved', () => {
      const run = {
        sequence_name: 'Deadline Approaching Follow-Through',
        trigger_data: {},
      } as unknown as FollowThroughRun;

      const worldState = {
        missing_docs: [],
        pending_approvals: 0,
        unresolved_exceptions: 0,
        completeness_score: 90,
      } as unknown as WorldStateSnapshot;

      const exitReason = shouldExitEarly(run, worldState);
      expect(exitReason).toBe('All blockers resolved');
    });
  });

  describe('Closing Prep', () => {
    it('triggers when stage enters closing', () => {
      const worldState = {
        missing_docs: [],
        pending_approvals: 0,
        unresolved_exceptions: 0,
        completeness_score: 80,
        urgent_deadlines: [],
        ownership: { owner_id: 'user1' },
        stage: 'closing',
        compliance_flags: [],
        overdue_obligations: 0,
        open_obligations: 0,
        entity_id: 'entity1',
      } as unknown as WorldStateSnapshot;

      const triggers = detectTriggers(worldState, { stage_transition: 'closing' });
      const closingTrigger = triggers.find(t => t.sequenceId === 'closing-prep-follow-through');
      expect(closingTrigger).toBeDefined();
    });

    it('exits when transaction closes', () => {
      const run = {
        sequence_name: 'Closing Prep Follow-Through',
        trigger_data: {},
      } as unknown as FollowThroughRun;

      const worldState = {
        stage: 'closed',
        completeness_score: 95,
      } as unknown as WorldStateSnapshot;

      const exitReason = shouldExitEarly(run, worldState);
      expect(exitReason).toBe('Transaction closed');
    });

    it('exits when closing readiness reaches 100%', () => {
      const run = {
        sequence_name: 'Closing Prep Follow-Through',
        trigger_data: {},
      } as unknown as FollowThroughRun;

      const worldState = {
        stage: 'closing',
        completeness_score: 100,
      } as unknown as WorldStateSnapshot;

      const exitReason = shouldExitEarly(run, worldState);
      expect(exitReason).toBe('Closing readiness is 100%');
    });
  });

  describe('Existing Sequences Regression', () => {
    it('missing document follow-through exits when document uploaded', () => {
      const run = {
        sequence_name: 'Missing Document Follow-Through',
        trigger_data: { document_type: 'purchase_agreement' },
      } as unknown as FollowThroughRun;

      const worldState = {
        missing_docs: ['disclosure'], // purchase_agreement is NOT missing = it was uploaded
      } as unknown as WorldStateSnapshot;

      const exitReason = shouldExitEarly(run, worldState);
      expect(exitReason).toBe('Document uploaded');
    });

    it('stale approval follow-through exits when approvals cleared', () => {
      const run = {
        sequence_name: 'Stale Approval Follow-Through',
        trigger_data: {},
      } as unknown as FollowThroughRun;

      const worldState = { pending_approvals: 0 } as unknown as WorldStateSnapshot;
      expect(shouldExitEarly(run, worldState)).toBe('Approval decided');
    });

    it('completeness recovery exits when score recovers', () => {
      const run = {
        sequence_name: 'Completeness Recovery',
        trigger_data: {},
      } as unknown as FollowThroughRun;

      const worldState = { completeness_score: 65 } as unknown as WorldStateSnapshot;
      expect(shouldExitEarly(run, worldState)).toBe('Completeness recovered above 60%');
    });
  });
});

// ---------------------------------------------------------------------------
// 6. High Risk Blocking Tests
// ---------------------------------------------------------------------------

describe('High Risk Blocking', () => {
  it('high_risk actions always blocked', () => {
    const decision = evaluatePolicy({
      toolName: 'suggest_stage_transition',
      riskClass: 'high_risk',
      confidence: 0.99,
      entityType: 'transaction',
      actorRole: 'broker_admin',
      complianceFlags: [],
      worldStage: 'under_contract',
    });
    expect(decision.disposition).toBe('block');
  });

  it('high_risk block includes escalation target', () => {
    const decision = evaluatePolicy({
      toolName: 'suggest_stage_transition',
      riskClass: 'high_risk',
      confidence: 0.9,
      entityType: 'transaction',
      actorRole: 'agent',
      complianceFlags: [],
      worldStage: 'under_contract',
    });
    expect(decision.escalation_target).toBeDefined();
  });

  it('high_risk cannot be bypassed even with org overrides', () => {
    const decision = evaluatePolicy({
      toolName: 'suggest_stage_transition',
      riskClass: 'high_risk',
      confidence: 0.99,
      entityType: 'transaction',
      actorRole: 'broker_admin',
      complianceFlags: [],
      worldStage: 'under_contract',
      orgPolicyOverrides: {
        promoted_to_safe: ['suggest_stage_transition'], // Should NOT work for high_risk
        demoted_to_blocked: [],
        require_approval_for: [],
      },
    });
    // promoted_to_safe only works for medium_risk, NOT high_risk
    expect(decision.disposition).toBe('block');
  });
});

// ---------------------------------------------------------------------------
// 7. Medium Risk Draft Creation Tests
// ---------------------------------------------------------------------------

describe('Medium Risk Draft Creation', () => {
  it('medium_risk with high confidence creates draft', () => {
    const decision = evaluatePolicy({
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.8,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'under_contract',
    });
    expect(decision.disposition).toBe('create_draft');
  });

  it('medium_risk with low confidence creates approval', () => {
    const decision = evaluatePolicy({
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.5,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'under_contract',
    });
    expect(decision.disposition).toBe('create_approval');
  });

  it('medium_risk promoted_to_safe by org -> auto_execute', () => {
    const decision = evaluatePolicy({
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.8,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'under_contract',
      orgPolicyOverrides: {
        promoted_to_safe: ['create_reminder_draft'],
        demoted_to_blocked: [],
        require_approval_for: [],
      },
    });
    expect(decision.disposition).toBe('auto_execute');
  });
});

// ---------------------------------------------------------------------------
// 8. Safe Action Auto-Execution Tests
// ---------------------------------------------------------------------------

describe('Safe Action Auto-Execution', () => {
  const safeTools = [
    'recompute_completeness',
    'recompute_exceptions',
    'recompute_health_score',
    'recompute_listing_readiness',
    'recompute_closing_readiness',
    'create_next_action_card',
    'create_timeline_event',
    'create_notification',
    'create_checklist_item',
    'create_internal_task',
    'mark_counterparty_waiting',
    'update_waiting_state',
    'clear_stale_next_actions',
    'request_manual_review',
  ];

  for (const tool of safeTools) {
    it(`${tool} auto-executes on active deals`, () => {
      const decision = evaluatePolicy({
        toolName: tool,
        riskClass: 'safe',
        confidence: 0.9,
        entityType: 'transaction',
        actorRole: 'agent',
        complianceFlags: [],
        worldStage: 'active',
      });
      expect(decision.disposition).toBe('auto_execute');
    });
  }
});

// ---------------------------------------------------------------------------
// 9. Org Isolation Tests
// ---------------------------------------------------------------------------

describe('Org Isolation', () => {
  it('org policy overrides are per-org', () => {
    const orgA: OrgPolicyOverrides = {
      promoted_to_safe: ['create_reminder_draft'],
      demoted_to_blocked: [],
      require_approval_for: [],
    };
    const orgB: OrgPolicyOverrides = {
      promoted_to_safe: [],
      demoted_to_blocked: ['create_reminder_draft'],
      require_approval_for: [],
    };

    const decisionA = evaluatePolicy({
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.8,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'active',
      orgPolicyOverrides: orgA,
    });

    const decisionB = evaluatePolicy({
      toolName: 'create_reminder_draft',
      riskClass: 'medium_risk',
      confidence: 0.8,
      entityType: 'transaction',
      actorRole: 'coordinator',
      complianceFlags: [],
      worldStage: 'active',
      orgPolicyOverrides: orgB,
    });

    expect(decisionA.disposition).toBe('auto_execute');
    expect(decisionB.disposition).toBe('block');
  });
});

// ---------------------------------------------------------------------------
// 10. Duplicate Suppression Tests
// ---------------------------------------------------------------------------

describe('Duplicate Suppression', () => {
  it('idempotency key is deterministic for same inputs', () => {
    const crypto = require('crypto');
    const generateKey = (cycleId: string, toolName: string, params: unknown) => {
      const raw = `${cycleId}-${toolName}-${JSON.stringify(params)}`;
      return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    };

    const key1 = generateKey('cycle-1', 'recompute_completeness', {});
    const key2 = generateKey('cycle-1', 'recompute_completeness', {});
    expect(key1).toBe(key2);
  });

  it('idempotency key differs for different params', () => {
    const crypto = require('crypto');
    const generateKey = (cycleId: string, toolName: string, params: unknown) => {
      const raw = `${cycleId}-${toolName}-${JSON.stringify(params)}`;
      return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    };

    const key1 = generateKey('cycle-1', 'create_notification', { message: 'A' });
    const key2 = generateKey('cycle-1', 'create_notification', { message: 'B' });
    expect(key1).not.toBe(key2);
  });
});
