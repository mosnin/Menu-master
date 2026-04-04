import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Autonomy Tests — action policy engine, follow-through
// sequences, safe action expansion, execution monitoring, draft creation,
// and high-risk blocking.
// Pure unit tests; no DB calls; all logic defined inline.
// ---------------------------------------------------------------------------

// ===================================================================
// 1. Action Policy Engine
// ===================================================================
describe('Action Policy Engine', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';

  type Disposition =
    | 'auto_execute'
    | 'create_draft'
    | 'create_approval'
    | 'block';

  interface PolicyResult {
    disposition: Disposition;
    reason: string;
    policy_rule: string;
    can_override: boolean;
    escalation_target?: string;
  }

  interface DealContext {
    stage: string;
    compliance_flags: string[];
    confidence: number;
  }

  interface OrgOverride {
    promoted_to_safe: string[];
    demoted_to_blocked: string[];
    require_approval_for: string[];
  }

  const TOOL_RISK: Record<string, RiskClass> = {
    recompute_completeness: 'safe',
    recompute_exceptions: 'safe',
    recompute_health_score: 'safe',
    create_notification: 'safe',
    create_checklist_item: 'safe',
    clear_stale_outputs: 'safe',
    create_internal_task: 'safe',
    update_waiting_state: 'safe',
    create_reminder_draft: 'medium_risk',
    create_document_request: 'medium_risk',
    assign_owner: 'medium_risk',
    create_approval_request: 'medium_risk',
    suggest_follow_up_draft: 'medium_risk',
    suggest_stage_transition: 'high_risk',
  };

  const CLOSED_STAGES = new Set(['closed', 'cancelled', 'archived']);

  function evaluatePolicy(
    toolName: string,
    context: DealContext,
    orgOverride?: OrgOverride,
  ): PolicyResult {
    // Unknown tool
    const baseRisk = TOOL_RISK[toolName];
    if (!baseRisk) {
      return {
        disposition: 'block',
        reason: `Unknown tool: ${toolName}`,
        policy_rule: 'unknown_tool_block',
        can_override: false,
      };
    }

    // Org override: demoted_to_blocked
    if (orgOverride?.demoted_to_blocked.includes(toolName)) {
      return {
        disposition: 'block',
        reason: `Tool ${toolName} demoted to blocked by org policy`,
        policy_rule: 'org_override_demoted',
        can_override: false,
      };
    }

    // Org override: require_approval_for
    if (orgOverride?.require_approval_for.includes(toolName)) {
      return {
        disposition: 'create_approval',
        reason: `Tool ${toolName} requires approval per org policy`,
        policy_rule: 'org_override_require_approval',
        can_override: true,
        escalation_target: 'broker_admin',
      };
    }

    // Closed deals block everything
    if (CLOSED_STAGES.has(context.stage)) {
      return {
        disposition: 'block',
        reason: `Cannot execute on ${context.stage} deal`,
        policy_rule: 'closed_deal_block',
        can_override: false,
      };
    }

    // High risk always blocks
    if (baseRisk === 'high_risk') {
      return {
        disposition: 'block',
        reason: `High-risk action requires human execution`,
        policy_rule: 'high_risk_block',
        can_override: false,
        escalation_target: 'broker_admin',
      };
    }

    // Org override: promoted_to_safe
    if (orgOverride?.promoted_to_safe.includes(toolName)) {
      return {
        disposition: 'auto_execute',
        reason: `Tool ${toolName} promoted to safe by org policy`,
        policy_rule: 'org_override_promoted',
        can_override: false,
      };
    }

    // Medium risk
    if (baseRisk === 'medium_risk') {
      // Compliance flags escalate to approval
      if (context.compliance_flags.length > 0) {
        return {
          disposition: 'create_approval',
          reason: 'Compliance flags present — escalated to approval',
          policy_rule: 'compliance_escalation',
          can_override: true,
          escalation_target: 'compliance_officer',
        };
      }
      // High confidence → draft, low confidence → approval
      if (context.confidence >= 0.7) {
        return {
          disposition: 'create_draft',
          reason: 'Medium-risk with high confidence — creating draft',
          policy_rule: 'medium_risk_high_confidence',
          can_override: true,
        };
      }
      return {
        disposition: 'create_approval',
        reason: 'Medium-risk with low confidence — needs approval',
        policy_rule: 'medium_risk_low_confidence',
        can_override: true,
        escalation_target: 'coordinator',
      };
    }

    // Safe on active deal
    return {
      disposition: 'auto_execute',
      reason: 'Safe action on active deal',
      policy_rule: 'safe_auto_execute',
      can_override: false,
    };
  }

  it('safe action on active deal -> auto_execute', () => {
    const result = evaluatePolicy('recompute_completeness', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.9,
    });
    expect(result.disposition).toBe('auto_execute');
  });

  it('safe action on closed deal -> block', () => {
    const result = evaluatePolicy('recompute_completeness', {
      stage: 'closed',
      compliance_flags: [],
      confidence: 0.9,
    });
    expect(result.disposition).toBe('block');
    expect(result.reason).toContain('closed');
  });

  it('medium_risk with high confidence -> create_draft', () => {
    const result = evaluatePolicy('create_reminder_draft', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.85,
    });
    expect(result.disposition).toBe('create_draft');
  });

  it('medium_risk with low confidence -> create_approval', () => {
    const result = evaluatePolicy('create_reminder_draft', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.5,
    });
    expect(result.disposition).toBe('create_approval');
    expect(result.escalation_target).toBe('coordinator');
  });

  it('high_risk -> always block', () => {
    const result = evaluatePolicy('suggest_stage_transition', {
      stage: 'active',
      compliance_flags: [],
      confidence: 1.0,
    });
    expect(result.disposition).toBe('block');
    expect(result.policy_rule).toBe('high_risk_block');
  });

  it('compliance flags escalate medium_risk to create_approval', () => {
    const result = evaluatePolicy('assign_owner', {
      stage: 'active',
      compliance_flags: ['critical:missing_disclosure'],
      confidence: 0.9,
    });
    expect(result.disposition).toBe('create_approval');
    expect(result.escalation_target).toBe('compliance_officer');
  });

  it('org override: promoted_to_safe makes medium_risk auto_execute', () => {
    const result = evaluatePolicy(
      'assign_owner',
      { stage: 'active', compliance_flags: [], confidence: 0.9 },
      { promoted_to_safe: ['assign_owner'], demoted_to_blocked: [], require_approval_for: [] },
    );
    expect(result.disposition).toBe('auto_execute');
    expect(result.policy_rule).toBe('org_override_promoted');
  });

  it('org override: demoted_to_blocked blocks otherwise safe action', () => {
    const result = evaluatePolicy(
      'create_notification',
      { stage: 'active', compliance_flags: [], confidence: 0.9 },
      { promoted_to_safe: [], demoted_to_blocked: ['create_notification'], require_approval_for: [] },
    );
    expect(result.disposition).toBe('block');
    expect(result.policy_rule).toBe('org_override_demoted');
  });

  it('org override: require_approval_for forces approval for any action', () => {
    const result = evaluatePolicy(
      'recompute_completeness',
      { stage: 'active', compliance_flags: [], confidence: 0.9 },
      { promoted_to_safe: [], demoted_to_blocked: [], require_approval_for: ['recompute_completeness'] },
    );
    expect(result.disposition).toBe('create_approval');
    expect(result.policy_rule).toBe('org_override_require_approval');
  });

  it('unknown tool -> block', () => {
    const result = evaluatePolicy('delete_all_data', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.9,
    });
    expect(result.disposition).toBe('block');
    expect(result.policy_rule).toBe('unknown_tool_block');
  });

  it('block disposition includes reason and policy_rule', () => {
    const result = evaluatePolicy('suggest_stage_transition', {
      stage: 'active',
      compliance_flags: [],
      confidence: 1.0,
    });
    expect(result.disposition).toBe('block');
    expect(result.reason).toBeTruthy();
    expect(result.policy_rule).toBeTruthy();
  });

  it('auto_execute disposition can_override is false', () => {
    const result = evaluatePolicy('create_notification', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.9,
    });
    expect(result.disposition).toBe('auto_execute');
    expect(result.can_override).toBe(false);
  });

  it('create_approval includes escalation_target', () => {
    const result = evaluatePolicy('create_reminder_draft', {
      stage: 'active',
      compliance_flags: [],
      confidence: 0.4,
    });
    expect(result.disposition).toBe('create_approval');
    expect(result.escalation_target).toBeDefined();
  });
});

// ===================================================================
// 2. Follow-Through Sequences
// ===================================================================
describe('Follow-Through Sequences', () => {
  type SequenceStatus = 'active' | 'completed' | 'cancelled' | 'failed' | 'waiting';

  interface SequenceStep {
    name: string;
    type: 'action' | 'check' | 'wait';
    tool_name?: string;
    check_fn?: (state: Record<string, unknown>) => boolean;
    max_wait_hours?: number;
  }

  interface SequenceDefinition {
    name: string;
    trigger_condition: (state: Record<string, unknown>) => boolean;
    exit_condition: (state: Record<string, unknown>) => boolean;
    max_duration_hours: number;
    steps: SequenceStep[];
  }

  interface SequenceRun {
    id: string;
    sequence_name: string;
    status: SequenceStatus;
    current_step: number;
    step_results: { step_name: string; success: boolean; timestamp: string }[];
    started_at: string;
    next_step_at: string | null;
    completed_at: string | null;
    exit_reason: string | null;
  }

  const SEQUENCES: Record<string, SequenceDefinition> = {
    missing_document_recovery: {
      name: 'missing_document_recovery',
      trigger_condition: (state) => (state.missing_docs as string[])?.length > 0,
      exit_condition: (state) => (state.missing_docs as string[])?.length === 0,
      max_duration_hours: 72,
      steps: [
        { name: 'create_checklist_item', type: 'action', tool_name: 'create_checklist_item' },
        { name: 'send_notification', type: 'action', tool_name: 'create_notification' },
        { name: 'wait_for_upload', type: 'wait', max_wait_hours: 24 },
        { name: 'check_document_status', type: 'check' },
        { name: 'send_reminder', type: 'action', tool_name: 'create_reminder_draft' },
      ],
    },
    stale_approval_recovery: {
      name: 'stale_approval_recovery',
      trigger_condition: (state) => {
        const hours = state.oldest_pending_approval_hours as number;
        return hours !== undefined && hours > 48;
      },
      exit_condition: (state) => (state.pending_approvals as number) === 0,
      max_duration_hours: 96,
      steps: [
        { name: 'escalate_notification', type: 'action', tool_name: 'create_notification' },
        { name: 'wait_for_resolution', type: 'wait', max_wait_hours: 24 },
        { name: 'check_status', type: 'check' },
      ],
    },
    completeness_recovery: {
      name: 'completeness_recovery',
      trigger_condition: (state) => (state.completeness_score as number) < 50,
      exit_condition: (state) => (state.completeness_score as number) >= 70,
      max_duration_hours: 120,
      steps: [
        { name: 'recompute', type: 'action', tool_name: 'recompute_completeness' },
        { name: 'identify_gaps', type: 'action', tool_name: 'create_checklist_item' },
        { name: 'notify_agent', type: 'action', tool_name: 'create_notification' },
        { name: 'wait_for_progress', type: 'wait', max_wait_hours: 48 },
        { name: 'recheck', type: 'check' },
      ],
    },
    post_document_upload: {
      name: 'post_document_upload',
      trigger_condition: (state) => (state.document_just_uploaded as boolean) === true,
      exit_condition: () => false, // runs to completion
      max_duration_hours: 1,
      steps: [
        { name: 'recompute_completeness', type: 'action', tool_name: 'recompute_completeness' },
        { name: 'recompute_exceptions', type: 'action', tool_name: 'recompute_exceptions' },
        { name: 'recompute_health', type: 'action', tool_name: 'recompute_health_score' },
        { name: 'notify_if_needed', type: 'check' },
      ],
    },
  };

  function canTriggerSequence(
    sequenceName: string,
    state: Record<string, unknown>,
    activeRuns: SequenceRun[],
  ): boolean {
    const def = SEQUENCES[sequenceName];
    if (!def) return false;
    // Don't re-trigger if already active for same sequence
    const alreadyActive = activeRuns.some(
      (r) => r.sequence_name === sequenceName && (r.status === 'active' || r.status === 'waiting'),
    );
    if (alreadyActive) return false;
    return def.trigger_condition(state);
  }

  function advanceSequence(
    run: SequenceRun,
    state: Record<string, unknown>,
    now: Date,
  ): SequenceRun {
    const def = SEQUENCES[run.sequence_name];
    if (!def) return { ...run, status: 'failed', exit_reason: 'Unknown sequence' };

    // Check exit condition
    if (def.exit_condition(state)) {
      return { ...run, status: 'completed', completed_at: now.toISOString(), exit_reason: 'exit_condition_met' };
    }

    // Check max duration
    const elapsed = now.getTime() - new Date(run.started_at).getTime();
    if (elapsed > def.max_duration_hours * 60 * 60 * 1000) {
      return { ...run, status: 'failed', completed_at: now.toISOString(), exit_reason: 'max_duration_exceeded' };
    }

    // Check waiting step
    const currentStep = def.steps[run.current_step - 1];
    if (currentStep?.type === 'wait' && run.next_step_at) {
      const waitUntil = new Date(run.next_step_at).getTime();
      if (now.getTime() < waitUntil) {
        return { ...run, status: 'waiting' };
      }
    }

    // Execute current step and advance
    const stepResult = {
      step_name: currentStep?.name ?? 'unknown',
      success: true,
      timestamp: now.toISOString(),
    };

    const nextStep = run.current_step + 1;
    const nextStepDef = def.steps[nextStep - 1];
    const isLast = nextStep > def.steps.length;

    let nextStepAt: string | null = null;
    if (nextStepDef?.type === 'wait' && nextStepDef.max_wait_hours) {
      nextStepAt = new Date(now.getTime() + nextStepDef.max_wait_hours * 60 * 60 * 1000).toISOString();
    }

    return {
      ...run,
      current_step: isLast ? run.current_step : nextStep,
      step_results: [...run.step_results, stepResult],
      status: isLast ? 'completed' : 'active',
      completed_at: isLast ? now.toISOString() : null,
      exit_reason: isLast ? 'all_steps_completed' : null,
      next_step_at: nextStepAt,
    };
  }

  function cancelSequence(run: SequenceRun, now: Date): SequenceRun {
    return {
      ...run,
      status: 'cancelled',
      completed_at: now.toISOString(),
      exit_reason: 'manually_cancelled',
    };
  }

  it('missing document sequence has correct steps', () => {
    const seq = SEQUENCES.missing_document_recovery;
    expect(seq.steps).toHaveLength(5);
    expect(seq.steps[0].name).toBe('create_checklist_item');
    expect(seq.steps[2].type).toBe('wait');
    expect(seq.steps[2].max_wait_hours).toBe(24);
  });

  it('stale approval sequence triggers after 48h', () => {
    const can = canTriggerSequence('stale_approval_recovery', { oldest_pending_approval_hours: 50 }, []);
    expect(can).toBe(true);
    const canNot = canTriggerSequence('stale_approval_recovery', { oldest_pending_approval_hours: 24 }, []);
    expect(canNot).toBe(false);
  });

  it('completeness recovery sequence triggers below 50%', () => {
    expect(canTriggerSequence('completeness_recovery', { completeness_score: 30 }, [])).toBe(true);
    expect(canTriggerSequence('completeness_recovery', { completeness_score: 70 }, [])).toBe(false);
  });

  it('post-document upload sequence runs all steps', () => {
    const now = new Date();
    let run: SequenceRun = {
      id: 'r1',
      sequence_name: 'post_document_upload',
      status: 'active',
      current_step: 1,
      step_results: [],
      started_at: now.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    const state = { document_just_uploaded: true };

    // Run through all 4 steps
    for (let i = 0; i < 4; i++) {
      run = advanceSequence(run, state, now);
    }
    expect(run.status).toBe('completed');
    expect(run.step_results).toHaveLength(4);
    expect(run.exit_reason).toBe('all_steps_completed');
  });

  it('sequence exits on exit condition met', () => {
    const now = new Date();
    const run: SequenceRun = {
      id: 'r1',
      sequence_name: 'missing_document_recovery',
      status: 'active',
      current_step: 3,
      step_results: [],
      started_at: now.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    // Exit condition: missing_docs is empty
    const result = advanceSequence(run, { missing_docs: [] }, now);
    expect(result.status).toBe('completed');
    expect(result.exit_reason).toBe('exit_condition_met');
  });

  it('sequence times out after max_duration', () => {
    const startedAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-05T00:00:00Z'); // 96h later, missing_document is 72h max
    const run: SequenceRun = {
      id: 'r1',
      sequence_name: 'missing_document_recovery',
      status: 'active',
      current_step: 3,
      step_results: [],
      started_at: startedAt.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    const result = advanceSequence(run, { missing_docs: ['disclosure'] }, now);
    expect(result.status).toBe('failed');
    expect(result.exit_reason).toBe('max_duration_exceeded');
  });

  it('sequence can be cancelled', () => {
    const now = new Date();
    const run: SequenceRun = {
      id: 'r1',
      sequence_name: 'missing_document_recovery',
      status: 'active',
      current_step: 2,
      step_results: [],
      started_at: now.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    const result = cancelSequence(run, now);
    expect(result.status).toBe('cancelled');
    expect(result.exit_reason).toBe('manually_cancelled');
    expect(result.completed_at).toBeTruthy();
  });

  it('sequence tracks step results', () => {
    const now = new Date();
    let run: SequenceRun = {
      id: 'r1',
      sequence_name: 'completeness_recovery',
      status: 'active',
      current_step: 1,
      step_results: [],
      started_at: now.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    run = advanceSequence(run, { completeness_score: 30 }, now);
    expect(run.step_results).toHaveLength(1);
    expect(run.step_results[0].step_name).toBe('recompute');
    expect(run.step_results[0].success).toBe(true);
  });

  it('waiting step respects max_wait_hours', () => {
    const now = new Date('2026-04-01T12:00:00Z');
    // Start at step 3 which is a wait step in missing_document_recovery
    const run: SequenceRun = {
      id: 'r1',
      sequence_name: 'missing_document_recovery',
      status: 'active',
      current_step: 2,
      step_results: [{ step_name: 'create_checklist_item', success: true, timestamp: now.toISOString() }],
      started_at: now.toISOString(),
      next_step_at: null,
      completed_at: null,
      exit_reason: null,
    };
    // Advance from step 2 to step 3 (wait step) — should set next_step_at
    const advanced = advanceSequence(run, { missing_docs: ['disclosure'] }, now);
    expect(advanced.current_step).toBe(3);
    expect(advanced.next_step_at).toBeTruthy();
    // The next_step_at should be 24 hours in the future
    const waitUntil = new Date(advanced.next_step_at!);
    const expectedWait = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(waitUntil.getTime()).toBe(expectedWait.getTime());
  });

  it('sequence does not re-trigger if already active for same trigger', () => {
    const activeRuns: SequenceRun[] = [
      {
        id: 'r1',
        sequence_name: 'missing_document_recovery',
        status: 'active',
        current_step: 2,
        step_results: [],
        started_at: new Date().toISOString(),
        next_step_at: null,
        completed_at: null,
        exit_reason: null,
      },
    ];
    const can = canTriggerSequence('missing_document_recovery', { missing_docs: ['disclosure'] }, activeRuns);
    expect(can).toBe(false);
  });
});

// ===================================================================
// 3. Safe Action Auto-Execution
// ===================================================================
describe('Safe Action Auto-Execution', () => {
  type RiskClass = 'safe' | 'medium_risk' | 'high_risk';

  const TOOL_RISK: Record<string, RiskClass> = {
    recompute_completeness: 'safe',
    recompute_exceptions: 'safe',
    recompute_health_score: 'safe',
    create_notification: 'safe',
    create_checklist_item: 'safe',
    clear_stale_outputs: 'safe',
    create_internal_task: 'safe',
    update_waiting_state: 'safe',
    create_reminder_draft: 'medium_risk',
    suggest_stage_transition: 'high_risk',
  };

  function shouldAutoExecute(toolName: string, dealStage: string): boolean {
    const risk = TOOL_RISK[toolName];
    if (!risk || risk !== 'safe') return false;
    // clear_stale_outputs always executes regardless of stage
    if (toolName === 'clear_stale_outputs') return true;
    // create_internal_task always executes regardless of stage
    if (toolName === 'create_internal_task') return true;
    // All others require active-like deal stage
    const activeStages = new Set(['active', 'due_diligence', 'under_contract', 'financing', 'closing_prep', 'pending_closing']);
    return activeStages.has(dealStage);
  }

  it('recompute tools are always auto_execute for active deals', () => {
    expect(shouldAutoExecute('recompute_completeness', 'active')).toBe(true);
    expect(shouldAutoExecute('recompute_exceptions', 'due_diligence')).toBe(true);
    expect(shouldAutoExecute('recompute_health_score', 'under_contract')).toBe(true);
  });

  it('create_notification is auto_execute for active deals', () => {
    expect(shouldAutoExecute('create_notification', 'active')).toBe(true);
    expect(shouldAutoExecute('create_notification', 'closing_prep')).toBe(true);
  });

  it('create_checklist_item is auto_execute for active deals', () => {
    expect(shouldAutoExecute('create_checklist_item', 'active')).toBe(true);
    expect(shouldAutoExecute('create_checklist_item', 'pending_closing')).toBe(true);
  });

  it('clear_stale_outputs is auto_execute', () => {
    expect(shouldAutoExecute('clear_stale_outputs', 'active')).toBe(true);
    expect(shouldAutoExecute('clear_stale_outputs', 'closed')).toBe(true);
  });

  it('create_internal_task is auto_execute', () => {
    expect(shouldAutoExecute('create_internal_task', 'active')).toBe(true);
    expect(shouldAutoExecute('create_internal_task', 'closed')).toBe(true);
  });

  it('update_waiting_state is auto_execute', () => {
    expect(shouldAutoExecute('update_waiting_state', 'active')).toBe(true);
    expect(shouldAutoExecute('update_waiting_state', 'financing')).toBe(true);
  });
});

// ===================================================================
// 4. Execution Monitoring
// ===================================================================
describe('Execution Monitoring', () => {
  type Disposition = 'auto_execute' | 'create_draft' | 'create_approval' | 'block';

  interface ActionRecord {
    id: string;
    tool_name: string;
    disposition: Disposition;
    status: 'executed' | 'pending_review' | 'blocked';
    policy_trace: string[];
    executed_at: string | null;
    cooldown_until: string | null;
  }

  function tagAction(
    toolName: string,
    disposition: Disposition,
    policyRules: string[],
    now: Date,
    cooldownMinutes: number = 5,
  ): ActionRecord {
    const id = `act_${Date.now()}`;
    if (disposition === 'auto_execute') {
      return {
        id,
        tool_name: toolName,
        disposition,
        status: 'executed',
        policy_trace: policyRules,
        executed_at: now.toISOString(),
        cooldown_until: new Date(now.getTime() + cooldownMinutes * 60 * 1000).toISOString(),
      };
    }
    if (disposition === 'block') {
      return {
        id,
        tool_name: toolName,
        disposition,
        status: 'blocked',
        policy_trace: policyRules,
        executed_at: null,
        cooldown_until: null,
      };
    }
    // draft or approval
    return {
      id,
      tool_name: toolName,
      disposition,
      status: 'pending_review',
      policy_trace: policyRules,
      executed_at: null,
      cooldown_until: null,
    };
  }

  function isOnCooldown(records: ActionRecord[], toolName: string, now: Date): boolean {
    const recent = records.filter((r) => r.tool_name === toolName && r.cooldown_until);
    return recent.some((r) => new Date(r.cooldown_until!).getTime() > now.getTime());
  }

  function isDuplicateDraft(records: ActionRecord[], toolName: string): boolean {
    return records.some(
      (r) => r.tool_name === toolName && r.status === 'pending_review' && r.disposition === 'create_draft',
    );
  }

  it('auto-executed actions are tagged with disposition', () => {
    const now = new Date();
    const record = tagAction('recompute_completeness', 'auto_execute', ['safe_auto_execute'], now);
    expect(record.disposition).toBe('auto_execute');
    expect(record.status).toBe('executed');
    expect(record.executed_at).toBeTruthy();
  });

  it('drafted actions show as pending review', () => {
    const now = new Date();
    const record = tagAction('create_reminder_draft', 'create_draft', ['medium_risk_high_confidence'], now);
    expect(record.status).toBe('pending_review');
    expect(record.executed_at).toBeNull();
  });

  it('blocked actions include policy trace', () => {
    const now = new Date();
    const record = tagAction('suggest_stage_transition', 'block', ['high_risk_block'], now);
    expect(record.status).toBe('blocked');
    expect(record.policy_trace).toContain('high_risk_block');
  });

  it('action cooldown prevents rapid re-execution of same tool', () => {
    const now = new Date();
    const records = [tagAction('recompute_completeness', 'auto_execute', ['safe_auto_execute'], now)];
    expect(isOnCooldown(records, 'recompute_completeness', now)).toBe(true);
    // After cooldown expires
    const later = new Date(now.getTime() + 10 * 60 * 1000); // 10 min later
    expect(isOnCooldown(records, 'recompute_completeness', later)).toBe(false);
  });

  it('duplicate draft suppression works', () => {
    const now = new Date();
    const records = [tagAction('create_reminder_draft', 'create_draft', ['medium_risk_high_confidence'], now)];
    expect(isDuplicateDraft(records, 'create_reminder_draft')).toBe(true);
    expect(isDuplicateDraft(records, 'create_document_request')).toBe(false);
  });
});

// ===================================================================
// 5. Medium Risk Draft Creation
// ===================================================================
describe('Medium Risk Draft Creation', () => {
  type DraftType = 'reminder' | 'communication' | 'approval_request';

  interface Draft {
    id: string;
    type: DraftType;
    tool_name: string;
    status: 'pending_review' | 'approved' | 'rejected';
    content: Record<string, unknown>;
    approval_queue_id: string | null;
    created_by: 'orchestrator';
    can_self_approve: boolean;
  }

  function createDraft(
    type: DraftType,
    toolName: string,
    content: Record<string, unknown>,
    approvalQueueId: string | null = null,
  ): Draft {
    return {
      id: `draft_${Date.now()}`,
      type,
      tool_name: toolName,
      status: 'pending_review',
      content,
      approval_queue_id: approvalQueueId,
      created_by: 'orchestrator',
      can_self_approve: false, // orchestrator can never self-approve
    };
  }

  function canOrchestratorUpgrade(draft: Draft): boolean {
    // Orchestrator can never upgrade a draft to execution
    return false;
  }

  it('reminder draft is created, not executed', () => {
    const draft = createDraft('reminder', 'create_reminder_draft', {
      recipient: 'daniel@email.com',
      subject: 'Earnest money reminder',
    });
    expect(draft.status).toBe('pending_review');
    expect(draft.created_by).toBe('orchestrator');
  });

  it('communication draft is created, not sent', () => {
    const draft = createDraft('communication', 'suggest_follow_up_draft', {
      recipient: 'patricia@email.com',
      body: 'Follow up on disclosures',
    });
    expect(draft.status).toBe('pending_review');
    expect(draft.type).toBe('communication');
  });

  it('approval request is created, not auto-approved', () => {
    const draft = createDraft('approval_request', 'create_approval_request', {
      approval_type: 'outbound_email',
    });
    expect(draft.status).toBe('pending_review');
    expect(draft.can_self_approve).toBe(false);
  });

  it('draft connects to existing approval queue', () => {
    const queueId = '60000000-0000-4000-8000-000000000001';
    const draft = createDraft('reminder', 'create_reminder_draft', {}, queueId);
    expect(draft.approval_queue_id).toBe(queueId);
  });

  it('orchestrator cannot upgrade draft to execution', () => {
    const draft = createDraft('reminder', 'create_reminder_draft', {});
    expect(canOrchestratorUpgrade(draft)).toBe(false);
  });
});

// ===================================================================
// 6. High Risk Blocking
// ===================================================================
describe('High Risk Blocking', () => {
  interface BlockedAction {
    tool_name: string;
    disposition: 'block';
    required_approver: string;
    source_signals: { type: string; description: string }[];
    blocked_by_policy: string;
    rationale: string;
    auditable: boolean;
    audit_entry: {
      action: string;
      actor_type: string;
      target_type: string;
      metadata: Record<string, unknown>;
    };
  }

  function blockHighRiskAction(
    toolName: string,
    reason: string,
    signals: { type: string; description: string }[],
    policyRule: string,
  ): BlockedAction {
    return {
      tool_name: toolName,
      disposition: 'block',
      required_approver: 'broker_admin',
      source_signals: signals,
      blocked_by_policy: policyRule,
      rationale: reason,
      auditable: true,
      audit_entry: {
        action: `blocked:${toolName}`,
        actor_type: 'orchestrator',
        target_type: 'action_proposal',
        metadata: {
          tool_name: toolName,
          policy_rule: policyRule,
          reason,
          signals,
        },
      },
    };
  }

  it('stage transition is always blocked', () => {
    const blocked = blockHighRiskAction(
      'suggest_stage_transition',
      'Stage transitions require human approval',
      [{ type: 'risk_class', description: 'high_risk tool' }],
      'high_risk_block',
    );
    expect(blocked.disposition).toBe('block');
    expect(blocked.tool_name).toBe('suggest_stage_transition');
  });

  it('blocked action includes required_approver', () => {
    const blocked = blockHighRiskAction(
      'suggest_stage_transition',
      'High risk',
      [],
      'high_risk_block',
    );
    expect(blocked.required_approver).toBe('broker_admin');
  });

  it('blocked action includes source_signals', () => {
    const signals = [
      { type: 'missing_docs', description: '3 documents missing' },
      { type: 'compliance', description: 'Active compliance flag' },
    ];
    const blocked = blockHighRiskAction(
      'suggest_stage_transition',
      'Multiple risk factors',
      signals,
      'high_risk_block',
    );
    expect(blocked.source_signals).toHaveLength(2);
    expect(blocked.source_signals[0].type).toBe('missing_docs');
  });

  it('blocked action includes blocked_by_policy rationale', () => {
    const blocked = blockHighRiskAction(
      'suggest_stage_transition',
      'Cannot transition with missing documents',
      [],
      'high_risk_missing_docs',
    );
    expect(blocked.blocked_by_policy).toBe('high_risk_missing_docs');
    expect(blocked.rationale).toBe('Cannot transition with missing documents');
  });

  it('blocked action is auditable', () => {
    const blocked = blockHighRiskAction(
      'suggest_stage_transition',
      'Blocked by policy',
      [],
      'high_risk_block',
    );
    expect(blocked.auditable).toBe(true);
    expect(blocked.audit_entry.action).toBe('blocked:suggest_stage_transition');
    expect(blocked.audit_entry.actor_type).toBe('orchestrator');
    expect(blocked.audit_entry.metadata.policy_rule).toBe('high_risk_block');
  });
});
