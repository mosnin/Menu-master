import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Specialist Layer Tests — pure unit tests.
// No DB calls; all logic tested via local function/type definitions.
// ---------------------------------------------------------------------------

// ===================================================================
// Shared Types
// ===================================================================

type EntityType = 'transaction' | 'listing';
type SpecialistRole = 'exception' | 'communications' | 'compliance' | 'closing' | 'listing' | 'handoff';
type FindingSeverity = 'info' | 'warning' | 'critical';
type TransactionStage = 'new' | 'active' | 'under_contract' | 'closed' | 'withdrawn' | 'expired';

interface SpecialistFinding {
  severity: FindingSeverity;
  confidence: number;
  summary: string;
  recommended_actions?: string[];
  blocked_reasons?: string[];
}

interface SpecialistRecommendation {
  tool_name: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

interface SpecialistOutput {
  specialist_role: SpecialistRole;
  operator_summary: string;
  findings: SpecialistFinding[];
  recommendations: SpecialistRecommendation[];
  contributed_to_plan: boolean;
  escalations?: string[];
}

interface RoutingWorldState {
  entity_type: EntityType;
  entity_id: string;
  stage: TransactionStage;
  unresolved_exceptions: number;
  open_obligations: number;
  compliance_flags: string[];
  has_accepted_offer: boolean;
}

interface SpecialistMemoryContext {
  specialist_role: SpecialistRole;
  memory_keys: string[];
  world_state_fields: string[];
}

interface Subgoal {
  id: string;
  description: string;
  source: string;
  is_blocker: boolean;
  requires_human_review: boolean;
}

interface PlanInfluence {
  subgoals: Subgoal[];
  blockers: string[];
  requires_human_review: boolean;
  audit_entries: string[];
}

// ===================================================================
// Valid tool names for the system
// ===================================================================

const VALID_TOOL_NAMES = [
  'send_email',
  'send_sms',
  'create_task',
  'update_stage',
  'upload_document',
  'request_signature',
  'schedule_inspection',
  'create_amendment',
  'escalate_to_human',
  'update_compliance_status',
  'send_reminder',
  'generate_closing_docs',
  'create_listing_update',
  'notify_parties',
  'flag_exception',
  'resolve_exception',
  'request_approval',
  'create_follow_up',
];

// ===================================================================
// 1. Specialist Routing Logic
// ===================================================================

function determineSpecialists(worldState: RoutingWorldState, maxSpecialists: number = 3): SpecialistRole[] {
  const specialists: SpecialistRole[] = [];

  if (worldState.unresolved_exceptions > 0) {
    specialists.push('exception');
  }
  if (worldState.open_obligations > 0) {
    specialists.push('communications');
  }
  if (worldState.compliance_flags.length > 0) {
    specialists.push('compliance');
  }
  if (worldState.entity_type === 'transaction' && worldState.stage === 'under_contract') {
    specialists.push('closing');
  }
  if (worldState.entity_type === 'listing') {
    specialists.push('listing');
  }
  if (worldState.entity_type === 'listing' && worldState.has_accepted_offer) {
    specialists.push('handoff');
  }

  return specialists.slice(0, maxSpecialists);
}

describe('Specialist Routing', () => {
  const baseState: RoutingWorldState = {
    entity_type: 'transaction',
    entity_id: 'ent-001',
    stage: 'active',
    unresolved_exceptions: 0,
    open_obligations: 0,
    compliance_flags: [],
    has_accepted_offer: false,
  };

  it('routes to exception specialist when unresolved exceptions > 0', () => {
    const state = { ...baseState, unresolved_exceptions: 2 };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('exception');
  });

  it('routes to communications specialist when open obligations > 0', () => {
    const state = { ...baseState, open_obligations: 3 };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('communications');
  });

  it('routes to compliance specialist when compliance flags present', () => {
    const state = { ...baseState, compliance_flags: ['missing_disclosure'] };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('compliance');
  });

  it('routes to closing specialist for under_contract transactions', () => {
    const state = { ...baseState, stage: 'under_contract' as TransactionStage };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('closing');
  });

  it('routes to listing specialist for listing entities', () => {
    const state: RoutingWorldState = { ...baseState, entity_type: 'listing' };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('listing');
  });

  it('routes to handoff specialist for listing with accepted offer', () => {
    const state: RoutingWorldState = { ...baseState, entity_type: 'listing', has_accepted_offer: true };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('handoff');
  });

  it('limits to max 3 specialists per cycle', () => {
    const state: RoutingWorldState = {
      ...baseState,
      entity_type: 'listing',
      unresolved_exceptions: 1,
      open_obligations: 2,
      compliance_flags: ['flag1'],
      has_accepted_offer: true,
    };
    const specialists = determineSpecialists(state, 3);
    expect(specialists.length).toBeLessThanOrEqual(3);
  });

  it('does not route to closing specialist for listings', () => {
    const state: RoutingWorldState = { ...baseState, entity_type: 'listing', stage: 'under_contract' };
    const specialists = determineSpecialists(state);
    expect(specialists).not.toContain('closing');
  });

  it('does not route to listing specialist for transactions', () => {
    const state = { ...baseState, entity_type: 'transaction' as EntityType };
    const specialists = determineSpecialists(state);
    expect(specialists).not.toContain('listing');
  });

  it('routes to multiple specialists when conditions overlap', () => {
    const state = {
      ...baseState,
      unresolved_exceptions: 1,
      open_obligations: 2,
      compliance_flags: ['flag1'],
    };
    const specialists = determineSpecialists(state);
    expect(specialists).toContain('exception');
    expect(specialists).toContain('communications');
    expect(specialists).toContain('compliance');
  });
});

// ===================================================================
// 2. Specialist Output Validation
// ===================================================================

function validateFinding(finding: SpecialistFinding): string[] {
  const errors: string[] = [];
  if (!finding.severity) errors.push('severity is required');
  if (finding.confidence === undefined || finding.confidence === null) errors.push('confidence is required');
  if (!finding.summary) errors.push('summary is required');
  if (!['info', 'warning', 'critical'].includes(finding.severity)) errors.push('invalid severity');
  if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) errors.push('confidence must be between 0 and 1');
  if (finding.blocked_reasons) {
    for (const reason of finding.blocked_reasons) {
      if (typeof reason !== 'string') errors.push('blocked reasons must be strings');
    }
  }
  return errors;
}

function validateRecommendation(rec: SpecialistRecommendation): string[] {
  const errors: string[] = [];
  if (!rec.tool_name) errors.push('tool_name is required');
  if (!rec.reason) errors.push('reason is required');
  if (!rec.urgency) errors.push('urgency is required');
  if (!VALID_TOOL_NAMES.includes(rec.tool_name)) errors.push(`invalid tool_name: ${rec.tool_name}`);
  return errors;
}

function validateSpecialistOutput(output: SpecialistOutput): string[] {
  const errors: string[] = [];
  if (output.findings.length > 5) errors.push('max 5 findings per specialist invocation');
  if (output.operator_summary.startsWith('{') || output.operator_summary.startsWith('[')) {
    errors.push('operator summary should be human readable, not raw JSON');
  }
  for (const f of output.findings) {
    errors.push(...validateFinding(f));
  }
  for (const r of output.recommendations) {
    errors.push(...validateRecommendation(r));
  }
  return errors;
}

describe('Specialist Output', () => {
  const validFinding: SpecialistFinding = {
    severity: 'warning',
    confidence: 0.85,
    summary: 'Missing seller disclosure form for property transfer.',
  };

  const validRecommendation: SpecialistRecommendation = {
    tool_name: 'send_reminder',
    reason: 'Seller has not provided disclosure form within 5 days',
    urgency: 'high',
  };

  const validOutput: SpecialistOutput = {
    specialist_role: 'compliance',
    operator_summary: 'Compliance review found one missing disclosure form. A reminder is recommended.',
    findings: [validFinding],
    recommendations: [validRecommendation],
    contributed_to_plan: true,
  };

  it('findings have required fields: severity, confidence, summary', () => {
    const errors = validateFinding(validFinding);
    expect(errors).toHaveLength(0);

    const badFinding = { severity: '' as FindingSeverity, confidence: undefined as unknown as number, summary: '' };
    const badErrors = validateFinding(badFinding);
    expect(badErrors.length).toBeGreaterThan(0);
  });

  it('recommendations have required fields: tool_name, reason, urgency', () => {
    const errors = validateRecommendation(validRecommendation);
    expect(errors).toHaveLength(0);

    const badRec = { tool_name: '', reason: '', urgency: '' as 'low' };
    const badErrors = validateRecommendation(badRec);
    expect(badErrors.length).toBeGreaterThan(0);
  });

  it('max 5 findings per specialist invocation', () => {
    const manyFindings: SpecialistOutput = {
      ...validOutput,
      findings: Array.from({ length: 6 }, (_, i) => ({
        ...validFinding,
        summary: `Finding ${i + 1}`,
      })),
    };
    const errors = validateSpecialistOutput(manyFindings);
    expect(errors).toContain('max 5 findings per specialist invocation');
  });

  it('operator summary is human readable (not raw JSON)', () => {
    const jsonOutput: SpecialistOutput = {
      ...validOutput,
      operator_summary: '{"status":"error","code":500}',
    };
    const errors = validateSpecialistOutput(jsonOutput);
    expect(errors).toContain('operator summary should be human readable, not raw JSON');
  });

  it('severity is one of info, warning, critical', () => {
    const badSeverity: SpecialistFinding = { ...validFinding, severity: 'urgent' as FindingSeverity };
    const errors = validateFinding(badSeverity);
    expect(errors).toContain('invalid severity');
  });

  it('confidence is between 0 and 1', () => {
    const lowConf = validateFinding({ ...validFinding, confidence: -0.1 });
    expect(lowConf).toContain('confidence must be between 0 and 1');

    const highConf = validateFinding({ ...validFinding, confidence: 1.5 });
    expect(highConf).toContain('confidence must be between 0 and 1');

    const validConf = validateFinding({ ...validFinding, confidence: 0.5 });
    expect(validConf).not.toContain('confidence must be between 0 and 1');
  });

  it('recommended tool names are valid', () => {
    const badRec: SpecialistRecommendation = { ...validRecommendation, tool_name: 'nonexistent_tool' };
    const errors = validateRecommendation(badRec);
    expect(errors.some((e) => e.includes('invalid tool_name'))).toBe(true);
  });

  it('blocked reasons are strings', () => {
    const finding: SpecialistFinding = {
      ...validFinding,
      blocked_reasons: ['Missing approval', 'Pending review'],
    };
    const errors = validateFinding(finding);
    expect(errors).not.toContain('blocked reasons must be strings');

    const badFinding: SpecialistFinding = {
      ...validFinding,
      blocked_reasons: [42 as unknown as string],
    };
    const badErrors = validateFinding(badFinding);
    expect(badErrors).toContain('blocked reasons must be strings');
  });
});

// ===================================================================
// 3. Arbitration Logic
// ===================================================================

interface ArbitrationResult {
  merged_recommendations: SpecialistRecommendation[];
  combined_summary: string;
  escalations: string[];
  conflicts: string[];
}

function arbitrateSpecialistOutputs(outputs: SpecialistOutput[]): ArbitrationResult {
  if (outputs.length === 0) {
    return { merged_recommendations: [], combined_summary: '', escalations: [], conflicts: [] };
  }

  if (outputs.length === 1) {
    return {
      merged_recommendations: outputs[0].recommendations,
      combined_summary: outputs[0].operator_summary,
      escalations: outputs[0].escalations ?? [],
      conflicts: [],
    };
  }

  // Collect all recommendations with source
  const allRecs: (SpecialistRecommendation & { source: SpecialistRole })[] = [];
  for (const output of outputs) {
    for (const rec of output.recommendations) {
      allRecs.push({ ...rec, source: output.specialist_role });
    }
  }

  // Collect all blocked tool names from findings with blocked_reasons + recommended_actions
  const blockedTools = new Set<string>();
  for (const output of outputs) {
    for (const finding of output.findings) {
      if (finding.blocked_reasons && finding.blocked_reasons.length > 0) {
        for (const action of finding.recommended_actions ?? []) {
          blockedTools.add(action);
        }
      }
    }
  }

  // Detect conflicts: one specialist recommends, another blocks
  const conflicts: string[] = [];
  for (const rec of allRecs) {
    if (blockedTools.has(rec.tool_name)) {
      conflicts.push(`Conflict: ${rec.source} recommends ${rec.tool_name}, but it is blocked`);
    }
  }

  // Deduplicate by tool_name — keep higher confidence source
  const recByTool = new Map<string, SpecialistRecommendation & { source: SpecialistRole; maxConfidence: number }>();
  for (const rec of allRecs) {
    const sourceOutput = outputs.find((o) => o.specialist_role === rec.source)!;
    const maxConf = sourceOutput.findings.length > 0
      ? Math.max(...sourceOutput.findings.map((f) => f.confidence))
      : 0;

    const existing = recByTool.get(rec.tool_name);
    if (!existing || maxConf > existing.maxConfidence) {
      recByTool.set(rec.tool_name, { ...rec, maxConfidence: maxConf });
    }
  }

  // Compliance findings take precedence — sort so compliance recs come first
  const mergedRecs = Array.from(recByTool.values()).sort((a, b) => {
    if (a.source === 'compliance' && b.source !== 'compliance') return -1;
    if (b.source === 'compliance' && a.source !== 'compliance') return 1;
    return 0;
  });

  // If conflicts exist, choose more cautious position (remove conflicting recs)
  const finalRecs = conflicts.length > 0
    ? mergedRecs.filter((r) => !blockedTools.has(r.tool_name))
    : mergedRecs;

  // Cap at 10 merged recommendations
  const cappedRecs: SpecialistRecommendation[] = finalRecs.slice(0, 10).map(({ source, maxConfidence, ...rec }) => rec);

  // Merge escalations from all specialists
  const allEscalations: string[] = [];
  for (const output of outputs) {
    if (output.escalations) {
      allEscalations.push(...output.escalations);
    }
  }

  // Combined summary
  const combined = outputs.map((o) => `[${o.specialist_role}] ${o.operator_summary}`).join(' ');

  return {
    merged_recommendations: cappedRecs,
    combined_summary: combined,
    escalations: allEscalations,
    conflicts,
  };
}

describe('Arbitration', () => {
  const makeOutput = (role: SpecialistRole, overrides: Partial<SpecialistOutput> = {}): SpecialistOutput => ({
    specialist_role: role,
    operator_summary: `${role} specialist assessment complete.`,
    findings: [{ severity: 'info', confidence: 0.7, summary: `${role} finding` }],
    recommendations: [{ tool_name: 'send_reminder', reason: `${role} recommends reminder`, urgency: 'medium' }],
    contributed_to_plan: false,
    ...overrides,
  });

  it('deduplicates recommendations with same tool_name', () => {
    const outputs = [
      makeOutput('exception', {
        recommendations: [{ tool_name: 'send_email', reason: 'Exception needs email', urgency: 'high' }],
      }),
      makeOutput('communications', {
        recommendations: [{ tool_name: 'send_email', reason: 'Communication needs email', urgency: 'medium' }],
      }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    const emailRecs = result.merged_recommendations.filter((r) => r.tool_name === 'send_email');
    expect(emailRecs).toHaveLength(1);
  });

  it('keeps higher confidence recommendation when deduplicating', () => {
    const outputs = [
      makeOutput('exception', {
        findings: [{ severity: 'critical', confidence: 0.95, summary: 'High confidence' }],
        recommendations: [{ tool_name: 'send_email', reason: 'Exception reason', urgency: 'high' }],
      }),
      makeOutput('communications', {
        findings: [{ severity: 'info', confidence: 0.4, summary: 'Low confidence' }],
        recommendations: [{ tool_name: 'send_email', reason: 'Comms reason', urgency: 'low' }],
      }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    const emailRec = result.merged_recommendations.find((r) => r.tool_name === 'send_email');
    expect(emailRec?.reason).toBe('Exception reason');
  });

  it('detects conflict when one specialist recommends, another blocks', () => {
    const outputs = [
      makeOutput('exception', {
        recommendations: [{ tool_name: 'send_email', reason: 'Need to send', urgency: 'high' }],
      }),
      makeOutput('compliance', {
        findings: [{
          severity: 'critical',
          confidence: 0.9,
          summary: 'Blocked',
          blocked_reasons: ['Compliance hold'],
          recommended_actions: ['send_email'],
        }],
        recommendations: [],
      }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('compliance findings take precedence', () => {
    const outputs = [
      makeOutput('exception', {
        recommendations: [{ tool_name: 'create_task', reason: 'Exception task', urgency: 'medium' }],
      }),
      makeOutput('compliance', {
        recommendations: [{ tool_name: 'update_compliance_status', reason: 'Compliance update', urgency: 'high' }],
      }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    expect(result.merged_recommendations[0].tool_name).toBe('update_compliance_status');
  });

  it('merges escalations from all specialists', () => {
    const outputs = [
      makeOutput('exception', { escalations: ['Escalation from exception'] }),
      makeOutput('compliance', { escalations: ['Escalation from compliance'] }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    expect(result.escalations).toContain('Escalation from exception');
    expect(result.escalations).toContain('Escalation from compliance');
  });

  it('creates combined operator summary', () => {
    const outputs = [
      makeOutput('exception', { operator_summary: 'Exception found issue.' }),
      makeOutput('compliance', { operator_summary: 'Compliance all clear.' }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    expect(result.combined_summary).toContain('[exception]');
    expect(result.combined_summary).toContain('[compliance]');
    expect(result.combined_summary).toContain('Exception found issue.');
    expect(result.combined_summary).toContain('Compliance all clear.');
  });

  it('caps at max 10 merged recommendations', () => {
    const manyRecs: SpecialistRecommendation[] = Array.from({ length: 6 }, (_, i) => ({
      tool_name: VALID_TOOL_NAMES[i],
      reason: `Reason ${i}`,
      urgency: 'medium' as const,
    }));
    const moreRecs: SpecialistRecommendation[] = Array.from({ length: 6 }, (_, i) => ({
      tool_name: VALID_TOOL_NAMES[i + 6],
      reason: `Reason ${i + 6}`,
      urgency: 'medium' as const,
    }));
    const outputs = [
      makeOutput('exception', { recommendations: manyRecs }),
      makeOutput('compliance', { recommendations: moreRecs }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    expect(result.merged_recommendations.length).toBeLessThanOrEqual(10);
  });

  it('handles empty specialist outputs', () => {
    const result = arbitrateSpecialistOutputs([]);
    expect(result.merged_recommendations).toHaveLength(0);
    expect(result.combined_summary).toBe('');
    expect(result.escalations).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('handles single specialist output', () => {
    const output = makeOutput('exception', {
      operator_summary: 'Single specialist found one issue.',
      recommendations: [{ tool_name: 'flag_exception', reason: 'Flag it', urgency: 'high' }],
    });
    const result = arbitrateSpecialistOutputs([output]);
    expect(result.merged_recommendations).toHaveLength(1);
    expect(result.combined_summary).toBe('Single specialist found one issue.');
    expect(result.conflicts).toHaveLength(0);
  });

  it('resolves conflict by choosing more cautious position', () => {
    const outputs = [
      makeOutput('exception', {
        recommendations: [{ tool_name: 'send_email', reason: 'Send it', urgency: 'high' }],
      }),
      makeOutput('compliance', {
        findings: [{
          severity: 'critical',
          confidence: 0.95,
          summary: 'Must not send',
          blocked_reasons: ['Regulatory hold'],
          recommended_actions: ['send_email'],
        }],
        recommendations: [],
      }),
    ];
    const result = arbitrateSpecialistOutputs(outputs);
    // Cautious = don't include the conflicting recommendation
    const sendEmailRec = result.merged_recommendations.find((r) => r.tool_name === 'send_email');
    expect(sendEmailRec).toBeUndefined();
  });
});

// ===================================================================
// 4. Specialist Memory Context
// ===================================================================

const MEMORY_CONTEXT_MAP: Record<SpecialistRole, SpecialistMemoryContext> = {
  exception: {
    specialist_role: 'exception',
    memory_keys: ['exceptions', 'exception_history', 'resolution_attempts'],
    world_state_fields: ['unresolved_exceptions', 'exception_details', 'resolution_paths'],
  },
  communications: {
    specialist_role: 'communications',
    memory_keys: ['communications', 'obligation_history', 'contact_preferences'],
    world_state_fields: ['open_obligations', 'last_contact_date', 'pending_responses'],
  },
  compliance: {
    specialist_role: 'compliance',
    memory_keys: ['compliance_checks', 'policy_violations', 'regulatory_requirements'],
    world_state_fields: ['compliance_flags', 'policy_data', 'regulatory_status'],
  },
  closing: {
    specialist_role: 'closing',
    memory_keys: ['closing_checklist', 'closing_economics', 'title_status'],
    world_state_fields: ['closing_readiness', 'economics_data', 'closing_date', 'title_clear'],
  },
  listing: {
    specialist_role: 'listing',
    memory_keys: ['listing_details', 'showing_history', 'price_changes'],
    world_state_fields: ['listing_status', 'days_on_market', 'showing_count', 'price_history'],
  },
  handoff: {
    specialist_role: 'handoff',
    memory_keys: ['offer_details', 'handoff_checklist', 'buyer_info'],
    world_state_fields: ['accepted_offer', 'handoff_status', 'buyer_qualification'],
  },
};

function getMemoryContextForSpecialist(role: SpecialistRole): SpecialistMemoryContext {
  return MEMORY_CONTEXT_MAP[role];
}

function filterWorldStateForSpecialist(
  role: SpecialistRole,
  fullWorldState: Record<string, unknown>,
): Record<string, unknown> {
  const context = MEMORY_CONTEXT_MAP[role];
  const filtered: Record<string, unknown> = {};
  for (const field of context.world_state_fields) {
    if (field in fullWorldState) {
      filtered[field] = fullWorldState[field];
    }
  }
  return filtered;
}

describe('Specialist Memory Context', () => {
  const fullWorldState: Record<string, unknown> = {
    unresolved_exceptions: 2,
    exception_details: [{ id: 'exc-1' }],
    resolution_paths: ['path-a'],
    open_obligations: 3,
    last_contact_date: '2026-01-01',
    pending_responses: 1,
    compliance_flags: ['flag-1'],
    policy_data: { policy: 'strict' },
    regulatory_status: 'pending',
    closing_readiness: 0.8,
    economics_data: { price: 500000 },
    closing_date: '2026-06-01',
    title_clear: true,
    listing_status: 'active',
    days_on_market: 30,
    showing_count: 12,
    price_history: [500000, 490000],
    accepted_offer: { amount: 480000 },
    handoff_status: 'pending',
    buyer_qualification: 'pre_approved',
  };

  it('exception specialist receives only exception-related memory', () => {
    const context = getMemoryContextForSpecialist('exception');
    expect(context.memory_keys).toContain('exceptions');
    expect(context.memory_keys).toContain('exception_history');
    expect(context.memory_keys).not.toContain('communications');
    expect(context.memory_keys).not.toContain('closing_checklist');
  });

  it('communications specialist receives only communication memory', () => {
    const context = getMemoryContextForSpecialist('communications');
    expect(context.memory_keys).toContain('communications');
    expect(context.memory_keys).toContain('obligation_history');
    expect(context.memory_keys).not.toContain('exceptions');
    expect(context.memory_keys).not.toContain('compliance_checks');
  });

  it('compliance specialist receives compliance flags and policy data', () => {
    const context = getMemoryContextForSpecialist('compliance');
    expect(context.memory_keys).toContain('compliance_checks');
    expect(context.memory_keys).toContain('policy_violations');
    expect(context.world_state_fields).toContain('compliance_flags');
    expect(context.world_state_fields).toContain('policy_data');
  });

  it('closing specialist receives closing readiness and economics data', () => {
    const context = getMemoryContextForSpecialist('closing');
    expect(context.world_state_fields).toContain('closing_readiness');
    expect(context.world_state_fields).toContain('economics_data');
    expect(context.memory_keys).toContain('closing_economics');
  });

  it('listing specialist receives listing-specific data', () => {
    const context = getMemoryContextForSpecialist('listing');
    expect(context.world_state_fields).toContain('listing_status');
    expect(context.world_state_fields).toContain('days_on_market');
    expect(context.world_state_fields).toContain('showing_count');
    expect(context.memory_keys).toContain('listing_details');
  });

  it('world state is filtered to relevant fields per specialist', () => {
    const exceptionState = filterWorldStateForSpecialist('exception', fullWorldState);
    expect(Object.keys(exceptionState)).toEqual(
      expect.arrayContaining(['unresolved_exceptions', 'exception_details', 'resolution_paths']),
    );
    expect(exceptionState).not.toHaveProperty('open_obligations');
    expect(exceptionState).not.toHaveProperty('closing_readiness');
    expect(exceptionState).not.toHaveProperty('listing_status');

    const closingState = filterWorldStateForSpecialist('closing', fullWorldState);
    expect(closingState).toHaveProperty('closing_readiness');
    expect(closingState).toHaveProperty('economics_data');
    expect(closingState).not.toHaveProperty('unresolved_exceptions');
  });
});

// ===================================================================
// 5. Integration with Planning
// ===================================================================

function buildPlanInfluence(outputs: SpecialistOutput[]): PlanInfluence {
  const subgoals: Subgoal[] = [];
  const blockers: string[] = [];
  let requiresHumanReview = false;
  const auditEntries: string[] = [];

  for (const output of outputs) {
    auditEntries.push(`Specialist ${output.specialist_role} invoked: ${output.findings.length} findings, ${output.recommendations.length} recommendations`);

    // Specialist recommendations influence plan subgoals
    for (const rec of output.recommendations) {
      subgoals.push({
        id: `sg-${output.specialist_role}-${rec.tool_name}`,
        description: rec.reason,
        source: output.specialist_role,
        is_blocker: rec.urgency === 'high',
        requires_human_review: false,
      });
    }

    // Critical compliance finding forces human review
    if (output.specialist_role === 'compliance') {
      const hasCritical = output.findings.some((f) => f.severity === 'critical');
      if (hasCritical) {
        requiresHumanReview = true;
        subgoals.push({
          id: 'sg-compliance-human-review',
          description: 'Critical compliance finding requires human review',
          source: 'compliance',
          is_blocker: true,
          requires_human_review: true,
        });
      }
    }

    // Exception specialist blocked reasons become plan blockers
    if (output.specialist_role === 'exception') {
      for (const finding of output.findings) {
        if (finding.blocked_reasons) {
          for (const reason of finding.blocked_reasons) {
            blockers.push(reason);
          }
        }
      }
    }

    // Communications specialist suggestions create follow-up subgoals
    if (output.specialist_role === 'communications') {
      for (const rec of output.recommendations) {
        subgoals.push({
          id: `sg-follow-up-${rec.tool_name}`,
          description: `Follow up: ${rec.reason}`,
          source: 'communications',
          is_blocker: false,
          requires_human_review: false,
        });
      }
    }

    // Closing specialist blockers prioritize close-critical subgoals
    if (output.specialist_role === 'closing') {
      for (const finding of output.findings) {
        if (finding.blocked_reasons && finding.blocked_reasons.length > 0) {
          subgoals.push({
            id: `sg-closing-blocker-${finding.summary.slice(0, 20).replace(/\s/g, '-')}`,
            description: `Close-critical: ${finding.summary}`,
            source: 'closing',
            is_blocker: true,
            requires_human_review: false,
          });
        }
      }
    }
  }

  // Log conflicting outputs
  const arbitrationResult = arbitrateSpecialistOutputs(outputs);
  if (arbitrationResult.conflicts.length > 0) {
    for (const conflict of arbitrationResult.conflicts) {
      auditEntries.push(`CONFLICT: ${conflict}`);
    }
  }

  return { subgoals, blockers, requires_human_review: requiresHumanReview, audit_entries: auditEntries };
}

describe('Integration with Planning', () => {
  const makeOutput = (role: SpecialistRole, overrides: Partial<SpecialistOutput> = {}): SpecialistOutput => ({
    specialist_role: role,
    operator_summary: `${role} specialist assessment.`,
    findings: [{ severity: 'info', confidence: 0.7, summary: `${role} finding` }],
    recommendations: [{ tool_name: 'send_reminder', reason: `${role} follow-up`, urgency: 'medium' }],
    contributed_to_plan: true,
    ...overrides,
  });

  it('specialist recommendations influence plan subgoals', () => {
    const outputs = [makeOutput('exception', {
      recommendations: [
        { tool_name: 'flag_exception', reason: 'Flag unresolved exception', urgency: 'high' },
      ],
    })];
    const influence = buildPlanInfluence(outputs);
    expect(influence.subgoals.some((sg) => sg.description.includes('Flag unresolved exception'))).toBe(true);
  });

  it('critical compliance finding forces human review', () => {
    const outputs = [makeOutput('compliance', {
      findings: [{ severity: 'critical', confidence: 0.95, summary: 'Major compliance violation' }],
    })];
    const influence = buildPlanInfluence(outputs);
    expect(influence.requires_human_review).toBe(true);
    expect(influence.subgoals.some((sg) => sg.requires_human_review)).toBe(true);
  });

  it('exception specialist blocked reasons become plan blockers', () => {
    const outputs = [makeOutput('exception', {
      findings: [{
        severity: 'critical',
        confidence: 0.9,
        summary: 'Cannot proceed',
        blocked_reasons: ['Missing inspection report', 'Pending title search'],
      }],
    })];
    const influence = buildPlanInfluence(outputs);
    expect(influence.blockers).toContain('Missing inspection report');
    expect(influence.blockers).toContain('Pending title search');
  });

  it('communications specialist suggestions create follow-up subgoals', () => {
    const outputs = [makeOutput('communications', {
      recommendations: [
        { tool_name: 'send_email', reason: 'Follow up with buyer agent', urgency: 'medium' },
      ],
    })];
    const influence = buildPlanInfluence(outputs);
    const followUp = influence.subgoals.find((sg) => sg.description.includes('Follow up'));
    expect(followUp).toBeDefined();
    expect(followUp?.source).toBe('communications');
  });

  it('closing specialist blockers prioritize close-critical subgoals', () => {
    const outputs = [makeOutput('closing', {
      findings: [{
        severity: 'warning',
        confidence: 0.8,
        summary: 'Title not cleared',
        blocked_reasons: ['Title search pending'],
      }],
    })];
    const influence = buildPlanInfluence(outputs);
    const closeCritical = influence.subgoals.find((sg) => sg.description.includes('Close-critical'));
    expect(closeCritical).toBeDefined();
    expect(closeCritical?.is_blocker).toBe(true);
  });

  it('specialist findings are recorded in cycle trace', () => {
    const outputs = [
      makeOutput('exception'),
      makeOutput('compliance'),
    ];
    const influence = buildPlanInfluence(outputs);
    expect(influence.audit_entries.some((e) => e.includes('exception'))).toBe(true);
    expect(influence.audit_entries.some((e) => e.includes('compliance'))).toBe(true);
  });

  it('specialist invocation is auditable', () => {
    const outputs = [makeOutput('closing', {
      findings: [{ severity: 'info', confidence: 0.6, summary: 'Closing on track' }],
      recommendations: [{ tool_name: 'generate_closing_docs', reason: 'Prepare docs', urgency: 'low' }],
    })];
    const influence = buildPlanInfluence(outputs);
    expect(influence.audit_entries.length).toBeGreaterThan(0);
    expect(influence.audit_entries[0]).toContain('closing');
    expect(influence.audit_entries[0]).toContain('1 findings');
    expect(influence.audit_entries[0]).toContain('1 recommendations');
  });

  it('conflicting specialist outputs are logged', () => {
    const outputs = [
      makeOutput('exception', {
        recommendations: [{ tool_name: 'send_email', reason: 'Need to send', urgency: 'high' }],
      }),
      makeOutput('compliance', {
        findings: [{
          severity: 'critical',
          confidence: 0.95,
          summary: 'Must not send email',
          blocked_reasons: ['Compliance hold'],
          recommended_actions: ['send_email'],
        }],
        recommendations: [],
      }),
    ];
    const influence = buildPlanInfluence(outputs);
    expect(influence.audit_entries.some((e) => e.includes('CONFLICT'))).toBe(true);
  });
});
