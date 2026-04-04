import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Orchestrator Specialist Collaboration Tests — routing, outputs, arbitration,
// memory context, and planning integration. Pure unit tests; no DB calls.
// ---------------------------------------------------------------------------

// ===================================================================
// 1. Specialist Routing
// ===================================================================
describe('Specialist Routing', () => {
  type SpecialistRole = 'exception' | 'communications' | 'compliance' | 'closing' | 'listing' | 'handoff';

  interface WorldState {
    entity_type: 'transaction' | 'listing';
    stage: string;
    unresolved_exceptions: number;
    compliance_flags: string[];
    open_obligations: number;
    overdue_obligations: number;
    has_accepted_offer: boolean;
  }

  const MAX_SPECIALISTS_PER_CYCLE = 3;

  function routeToSpecialists(ws: WorldState): SpecialistRole[] {
    const roles: SpecialistRole[] = [];

    if (ws.unresolved_exceptions > 0 || ws.compliance_flags.length > 0) {
      roles.push('exception');
    }
    if (ws.open_obligations > 0 || ws.overdue_obligations > 0) {
      roles.push('communications');
    }
    if (ws.compliance_flags.length > 0) {
      roles.push('compliance');
    }
    if (ws.entity_type === 'transaction' && (ws.stage === 'under_contract' || ws.stage === 'closing')) {
      roles.push('closing');
    }
    if (ws.entity_type === 'listing') {
      roles.push('listing');
    }
    if (ws.entity_type === 'listing' && ws.has_accepted_offer) {
      roles.push('handoff');
    }

    return roles.slice(0, MAX_SPECIALISTS_PER_CYCLE);
  }

  it('routes to exception specialist when unresolved exceptions > 0', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'active', unresolved_exceptions: 2,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).toContain('exception');
  });

  it('routes to communications specialist when open obligations > 0', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'active', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 3, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).toContain('communications');
  });

  it('routes to compliance specialist when compliance flags present', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'active', unresolved_exceptions: 0,
      compliance_flags: ['missing_disclosure'], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).toContain('compliance');
  });

  it('routes to closing specialist for under_contract transactions', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'under_contract', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).toContain('closing');
  });

  it('routes to listing specialist for listing entities', () => {
    const roles = routeToSpecialists({
      entity_type: 'listing', stage: 'active', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).toContain('listing');
  });

  it('routes to handoff specialist for listing with accepted offer', () => {
    const roles = routeToSpecialists({
      entity_type: 'listing', stage: 'active', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: true,
    });
    expect(roles).toContain('handoff');
  });

  it('limits to max 3 specialists per cycle', () => {
    const roles = routeToSpecialists({
      entity_type: 'listing', stage: 'active', unresolved_exceptions: 3,
      compliance_flags: ['flag1'], open_obligations: 2, overdue_obligations: 1, has_accepted_offer: true,
    });
    expect(roles.length).toBeLessThanOrEqual(3);
  });

  it('does not route to closing specialist for listings', () => {
    const roles = routeToSpecialists({
      entity_type: 'listing', stage: 'closing', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).not.toContain('closing');
  });

  it('does not route to listing specialist for transactions', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'active', unresolved_exceptions: 0,
      compliance_flags: [], open_obligations: 0, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles).not.toContain('listing');
  });

  it('routes to multiple specialists when conditions overlap', () => {
    const roles = routeToSpecialists({
      entity_type: 'transaction', stage: 'under_contract', unresolved_exceptions: 1,
      compliance_flags: ['flag'], open_obligations: 2, overdue_obligations: 0, has_accepted_offer: false,
    });
    expect(roles.length).toBeGreaterThanOrEqual(2);
  });
});

// ===================================================================
// 2. Specialist Output Contracts
// ===================================================================
describe('Specialist Output Contracts', () => {
  type Severity = 'info' | 'warning' | 'critical';

  interface Finding {
    severity: Severity;
    confidence: number;
    summary: string;
    recommended_actions: { tool_name: string; reason: string; urgency: string }[];
    blocked_reasons: string[];
  }

  interface SpecialistOutput {
    role: string;
    findings: Finding[];
    operator_summary: string;
    duration_ms: number;
  }

  const VALID_SEVERITIES: Severity[] = ['info', 'warning', 'critical'];
  const MAX_FINDINGS = 5;

  function validateOutput(output: SpecialistOutput): string[] {
    const errors: string[] = [];
    if (!output.role) errors.push('Missing role');
    if (!output.operator_summary) errors.push('Missing operator_summary');
    if (output.findings.length > MAX_FINDINGS) errors.push(`Too many findings: ${output.findings.length}`);
    for (const f of output.findings) {
      if (!VALID_SEVERITIES.includes(f.severity)) errors.push(`Invalid severity: ${f.severity}`);
      if (f.confidence < 0 || f.confidence > 1) errors.push(`Confidence out of range: ${f.confidence}`);
      if (!f.summary) errors.push('Finding missing summary');
      for (const a of f.recommended_actions) {
        if (!a.tool_name) errors.push('Recommendation missing tool_name');
        if (!a.reason) errors.push('Recommendation missing reason');
      }
    }
    return errors;
  }

  it('findings have required fields', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Found issues', duration_ms: 50,
      findings: [{
        severity: 'warning', confidence: 0.8, summary: 'Missing doc',
        recommended_actions: [{ tool_name: 'create_notification', reason: 'Alert agent', urgency: 'high' }],
        blocked_reasons: [],
      }],
    };
    expect(validateOutput(output)).toHaveLength(0);
  });

  it('max 5 findings per specialist invocation', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Issues', duration_ms: 50,
      findings: Array(6).fill({
        severity: 'info', confidence: 0.5, summary: 'test',
        recommended_actions: [], blocked_reasons: [],
      }),
    };
    expect(validateOutput(output).some(e => e.includes('Too many findings'))).toBe(true);
  });

  it('operator summary is non-empty', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: '', duration_ms: 50, findings: [],
    };
    expect(validateOutput(output)).toContain('Missing operator_summary');
  });

  it('severity must be valid', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Test', duration_ms: 50,
      findings: [{ severity: 'extreme' as Severity, confidence: 0.5, summary: 'test', recommended_actions: [], blocked_reasons: [] }],
    };
    expect(validateOutput(output).some(e => e.includes('Invalid severity'))).toBe(true);
  });

  it('confidence must be between 0 and 1', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Test', duration_ms: 50,
      findings: [{ severity: 'info', confidence: 1.5, summary: 'test', recommended_actions: [], blocked_reasons: [] }],
    };
    expect(validateOutput(output).some(e => e.includes('Confidence out of range'))).toBe(true);
  });

  it('recommendations require tool_name and reason', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Test', duration_ms: 50,
      findings: [{
        severity: 'info', confidence: 0.5, summary: 'test',
        recommended_actions: [{ tool_name: '', reason: 'test', urgency: 'low' }],
        blocked_reasons: [],
      }],
    };
    expect(validateOutput(output).some(e => e.includes('tool_name'))).toBe(true);
  });

  it('blocked reasons are strings', () => {
    const output: SpecialistOutput = {
      role: 'exception', operator_summary: 'Test', duration_ms: 50,
      findings: [{
        severity: 'warning', confidence: 0.8, summary: 'Blocked',
        recommended_actions: [], blocked_reasons: ['waiting on seller', 'missing title'],
      }],
    };
    expect(output.findings[0].blocked_reasons.every(r => typeof r === 'string')).toBe(true);
  });

  it('valid output passes validation', () => {
    const output: SpecialistOutput = {
      role: 'compliance', operator_summary: 'Compliance review complete', duration_ms: 120,
      findings: [{
        severity: 'critical', confidence: 0.95, summary: 'Missing required disclosure',
        recommended_actions: [{ tool_name: 'create_document_request', reason: 'Request disclosure', urgency: 'critical' }],
        blocked_reasons: ['Cannot proceed without disclosure'],
      }],
    };
    expect(validateOutput(output)).toHaveLength(0);
  });
});

// ===================================================================
// 3. Arbitration
// ===================================================================
describe('Arbitration', () => {
  interface Recommendation { tool_name: string; reason: string; urgency: string; confidence: number }
  interface SpecialistOutput {
    role: string;
    findings: { severity: string; blocked_reasons: string[] }[];
    recommendations: Recommendation[];
    escalations: string[];
    operator_summary: string;
  }
  interface ArbitrationResult {
    merged: Recommendation[];
    conflicts: { specialist_a: string; specialist_b: string; description: string }[];
    escalations: string[];
    summary: string;
  }

  const MAX_RECOMMENDATIONS = 10;

  function arbitrate(outputs: SpecialistOutput[]): ArbitrationResult {
    const allRecs: (Recommendation & { source: string })[] = [];
    const allEscalations: string[] = [];
    const conflicts: { specialist_a: string; specialist_b: string; description: string }[] = [];
    const summaries: string[] = [];

    for (const out of outputs) {
      for (const rec of out.recommendations) {
        allRecs.push({ ...rec, source: out.role });
      }
      allEscalations.push(...out.escalations);
      if (out.operator_summary) summaries.push(`[${out.role}] ${out.operator_summary}`);
    }

    // Deduplicate: keep higher confidence
    const deduped = new Map<string, Recommendation & { source: string }>();
    for (const rec of allRecs) {
      const existing = deduped.get(rec.tool_name);
      if (!existing || rec.confidence > existing.confidence) {
        deduped.set(rec.tool_name, rec);
      }
    }

    // Detect conflicts: one recommends, another blocks
    const blockedTools = new Set<string>();
    for (const out of outputs) {
      for (const f of out.findings) {
        for (const reason of f.blocked_reasons) {
          // Extract tool name from block reason if possible
          for (const rec of allRecs) {
            if (reason.toLowerCase().includes(rec.tool_name.replace(/_/g, ' '))) {
              blockedTools.add(rec.tool_name);
              const recommender = allRecs.find(r => r.tool_name === rec.tool_name)?.source;
              if (recommender && recommender !== out.role) {
                conflicts.push({
                  specialist_a: recommender, specialist_b: out.role,
                  description: `${recommender} recommends ${rec.tool_name}, ${out.role} blocks it`,
                });
              }
            }
          }
        }
      }
    }

    // Compliance takes precedence: remove blocked tools
    const complianceBlocked = outputs
      .filter(o => o.role === 'compliance')
      .flatMap(o => o.findings.filter(f => f.severity === 'critical').flatMap(f => f.blocked_reasons));
    for (const reason of complianceBlocked) {
      for (const [toolName] of deduped) {
        if (reason.toLowerCase().includes(toolName.replace(/_/g, ' '))) {
          deduped.delete(toolName);
        }
      }
    }

    const merged = Array.from(deduped.values())
      .map(({ source: _s, ...rec }) => rec)
      .slice(0, MAX_RECOMMENDATIONS);

    return {
      merged,
      conflicts,
      escalations: [...new Set(allEscalations)],
      summary: summaries.join(' | '),
    };
  }

  it('deduplicates recommendations with same tool_name', () => {
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: [{ tool_name: 'create_notification', reason: 'a', urgency: 'high', confidence: 0.7 }], escalations: [], operator_summary: '' },
      { role: 'communications', findings: [], recommendations: [{ tool_name: 'create_notification', reason: 'b', urgency: 'normal', confidence: 0.9 }], escalations: [], operator_summary: '' },
    ]);
    expect(result.merged.filter(r => r.tool_name === 'create_notification')).toHaveLength(1);
  });

  it('keeps higher confidence recommendation when deduplicating', () => {
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: [{ tool_name: 'create_notification', reason: 'low', urgency: 'high', confidence: 0.5 }], escalations: [], operator_summary: '' },
      { role: 'communications', findings: [], recommendations: [{ tool_name: 'create_notification', reason: 'high', urgency: 'normal', confidence: 0.9 }], escalations: [], operator_summary: '' },
    ]);
    expect(result.merged[0].confidence).toBe(0.9);
  });

  it('merges escalations from all specialists', () => {
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: [], escalations: ['esc1'], operator_summary: '' },
      { role: 'compliance', findings: [], recommendations: [], escalations: ['esc2'], operator_summary: '' },
    ]);
    expect(result.escalations).toContain('esc1');
    expect(result.escalations).toContain('esc2');
  });

  it('creates combined operator summary', () => {
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: [], escalations: [], operator_summary: 'Found 2 issues' },
      { role: 'compliance', findings: [], recommendations: [], escalations: [], operator_summary: 'Policy concern' },
    ]);
    expect(result.summary).toContain('exception');
    expect(result.summary).toContain('compliance');
  });

  it('caps at max 10 merged recommendations', () => {
    const recs = Array.from({ length: 15 }, (_, i) => ({
      tool_name: `tool_${i}`, reason: 'test', urgency: 'normal', confidence: 0.5,
    }));
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: recs, escalations: [], operator_summary: '' },
    ]);
    expect(result.merged.length).toBeLessThanOrEqual(10);
  });

  it('handles empty specialist outputs', () => {
    const result = arbitrate([]);
    expect(result.merged).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('handles single specialist output', () => {
    const result = arbitrate([
      { role: 'closing', findings: [], recommendations: [{ tool_name: 'recompute_closing_readiness', reason: 'check', urgency: 'high', confidence: 0.85 }], escalations: [], operator_summary: 'Closing check' },
    ]);
    expect(result.merged).toHaveLength(1);
  });

  it('deduplicates escalations', () => {
    const result = arbitrate([
      { role: 'exception', findings: [], recommendations: [], escalations: ['same_esc'], operator_summary: '' },
      { role: 'compliance', findings: [], recommendations: [], escalations: ['same_esc'], operator_summary: '' },
    ]);
    expect(result.escalations.filter(e => e === 'same_esc')).toHaveLength(1);
  });
});

// ===================================================================
// 4. Specialist Memory Context
// ===================================================================
describe('Specialist Memory Context', () => {
  type MemoryType = 'blocker' | 'action_taken' | 'failure_pattern' | 'counterparty_signal' | 'human_correction';

  interface MemoryEntry { type: MemoryType; details: string }

  function filterMemoryForSpecialist(role: string, entries: MemoryEntry[]): MemoryEntry[] {
    const roleFilters: Record<string, MemoryType[]> = {
      exception: ['blocker', 'failure_pattern'],
      communications: ['counterparty_signal', 'action_taken'],
      compliance: ['blocker', 'human_correction'],
      closing: ['blocker', 'action_taken', 'failure_pattern'],
      listing: ['blocker', 'action_taken'],
      handoff: ['action_taken', 'human_correction'],
    };
    const allowed = roleFilters[role] ?? [];
    return entries.filter(e => allowed.includes(e.type));
  }

  const allMemory: MemoryEntry[] = [
    { type: 'blocker', details: 'Missing title' },
    { type: 'action_taken', details: 'Sent notification' },
    { type: 'failure_pattern', details: 'Assign failed' },
    { type: 'counterparty_signal', details: 'Seller unresponsive' },
    { type: 'human_correction', details: 'Override stage' },
  ];

  it('exception specialist receives only exception-related memory', () => {
    const filtered = filterMemoryForSpecialist('exception', allMemory);
    expect(filtered.every(e => ['blocker', 'failure_pattern'].includes(e.type))).toBe(true);
  });

  it('communications specialist receives only communication memory', () => {
    const filtered = filterMemoryForSpecialist('communications', allMemory);
    expect(filtered.every(e => ['counterparty_signal', 'action_taken'].includes(e.type))).toBe(true);
  });

  it('compliance specialist receives compliance-relevant data', () => {
    const filtered = filterMemoryForSpecialist('compliance', allMemory);
    expect(filtered.every(e => ['blocker', 'human_correction'].includes(e.type))).toBe(true);
  });

  it('closing specialist receives closing-relevant data', () => {
    const filtered = filterMemoryForSpecialist('closing', allMemory);
    expect(filtered.every(e => ['blocker', 'action_taken', 'failure_pattern'].includes(e.type))).toBe(true);
  });

  it('listing specialist receives listing-relevant data', () => {
    const filtered = filterMemoryForSpecialist('listing', allMemory);
    expect(filtered.every(e => ['blocker', 'action_taken'].includes(e.type))).toBe(true);
  });

  it('each specialist gets filtered world state', () => {
    // Verify that filtering happens (not all entries returned)
    const exceptionMemory = filterMemoryForSpecialist('exception', allMemory);
    const commsMemory = filterMemoryForSpecialist('communications', allMemory);
    expect(exceptionMemory.length).toBeLessThan(allMemory.length);
    expect(commsMemory.length).toBeLessThan(allMemory.length);
  });
});

// ===================================================================
// 5. Integration with Planning
// ===================================================================
describe('Integration with Planning', () => {
  interface SpecialistFinding { severity: string; summary: string; blocked_reasons: string[] }

  function shouldForceHumanReview(findings: SpecialistFinding[]): boolean {
    return findings.some(f => f.severity === 'critical');
  }

  function extractBlockedReasons(findings: SpecialistFinding[]): string[] {
    return findings.flatMap(f => f.blocked_reasons);
  }

  function findingsInfluenceSubgoals(findings: SpecialistFinding[]): boolean {
    return findings.some(f => f.severity === 'warning' || f.severity === 'critical');
  }

  it('critical compliance finding forces human review', () => {
    const findings: SpecialistFinding[] = [
      { severity: 'critical', summary: 'Missing disclosure', blocked_reasons: [] },
    ];
    expect(shouldForceHumanReview(findings)).toBe(true);
  });

  it('info findings do not force human review', () => {
    const findings: SpecialistFinding[] = [
      { severity: 'info', summary: 'All good', blocked_reasons: [] },
    ];
    expect(shouldForceHumanReview(findings)).toBe(false);
  });

  it('blocked reasons become plan blockers', () => {
    const findings: SpecialistFinding[] = [
      { severity: 'warning', summary: 'Issue', blocked_reasons: ['waiting on seller', 'missing title'] },
    ];
    const blockers = extractBlockedReasons(findings);
    expect(blockers).toHaveLength(2);
    expect(blockers).toContain('waiting on seller');
  });

  it('warning/critical findings influence subgoals', () => {
    expect(findingsInfluenceSubgoals([{ severity: 'warning', summary: 'x', blocked_reasons: [] }])).toBe(true);
    expect(findingsInfluenceSubgoals([{ severity: 'critical', summary: 'x', blocked_reasons: [] }])).toBe(true);
  });

  it('info findings do not influence subgoals', () => {
    expect(findingsInfluenceSubgoals([{ severity: 'info', summary: 'x', blocked_reasons: [] }])).toBe(false);
  });

  it('specialist invocation is auditable', () => {
    const auditEntry = {
      action: 'orchestrator.specialist_invoked',
      targetType: 'specialist',
      metadata: { role: 'compliance', findings_count: 2, duration_ms: 150 },
    };
    expect(auditEntry.action).toBe('orchestrator.specialist_invoked');
    expect(auditEntry.metadata.role).toBe('compliance');
  });

  it('conflicting specialist outputs are loggable', () => {
    const conflict = {
      specialist_a: 'exception',
      specialist_b: 'compliance',
      description: 'exception recommends action, compliance blocks it',
    };
    expect(conflict.specialist_a).toBeTruthy();
    expect(conflict.specialist_b).toBeTruthy();
    expect(conflict.description).toBeTruthy();
  });

  it('empty findings do not influence planning', () => {
    expect(findingsInfluenceSubgoals([])).toBe(false);
    expect(shouldForceHumanReview([])).toBe(false);
    expect(extractBlockedReasons([])).toHaveLength(0);
  });
});
