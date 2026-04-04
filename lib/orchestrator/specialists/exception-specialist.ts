import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'exception',
  description:
    'Examines unresolved exceptions, contradictions, and repeated failures. Classifies severity and suggests recovery paths.',
  allowed_entity_types: ['transaction', 'listing'],
  trigger_conditions: [
    'unresolved_exceptions > 0',
    'compliance_flags present',
    'repeated failure patterns in memory',
  ],
  max_findings: MAX_FINDINGS,
  timeout_ms: 5000,
};

async function execute(input: SpecialistInput): Promise<SpecialistOutput> {
  const start = Date.now();
  const findings: SpecialistFinding[] = [];
  const ws = input.worldState;

  const unresolvedExceptions = (ws.unresolved_exceptions as number) ?? 0;
  const complianceFlags = (ws.compliance_flags as string[]) ?? [];
  const recentCorrections = (ws.recent_corrections as number) ?? 0;

  // 1. Unresolved exceptions
  if (unresolvedExceptions > 0) {
    const severity =
      unresolvedExceptions >= 5
        ? 'critical'
        : unresolvedExceptions >= 2
          ? 'warning'
          : 'info';

    findings.push({
      severity,
      confidence: 0.95,
      summary: `${unresolvedExceptions} unresolved exception(s) require attention`,
      details: `There are ${unresolvedExceptions} unresolved exceptions on this ${input.entityType}. ${severity === 'critical' ? 'Immediate action is required.' : 'Review and resolve before progressing.'}`,
      recommended_actions: [
        {
          tool_name: 'recompute_exceptions',
          reason: 'Recompute to get current exception state',
          urgency: severity === 'critical' ? 'critical' : 'high',
          confidence: 0.9,
        },
      ],
      blocked_reasons:
        severity === 'critical'
          ? ['Too many unresolved exceptions to safely progress']
          : [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 2. Compliance flags as exception signals
  if (complianceFlags.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'warning',
      confidence: 0.9,
      summary: `${complianceFlags.length} compliance flag(s) acting as exception barriers`,
      details: `Active compliance flags: ${complianceFlags.join(', ')}. These may block progression and need resolution.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Alert compliance team about active flags',
          urgency: 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons: complianceFlags.map(
        (f) => `Compliance flag active: ${f}`,
      ),
      needed_approvals: ['compliance_review'],
      dependencies: [],
    });
  }

  // 3. Repeated corrections suggest systemic issues
  if (recentCorrections >= 3 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'warning',
      confidence: 0.8,
      summary: 'Repeated human corrections detected — possible systemic issue',
      details: `${recentCorrections} recent corrections have been applied. This pattern suggests the orchestrator may be making inappropriate recommendations or underlying data quality is poor.`,
      recommended_actions: [
        {
          tool_name: 'recompute_completeness',
          reason: 'Recompute completeness to re-baseline state',
          urgency: 'normal',
          confidence: 0.75,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 4. Repeated failure patterns in memory
  const failureMemories = input.memory.filter(
    (m) => m.memory_type === 'failure_pattern',
  );
  if (failureMemories.length >= 2 && findings.length < MAX_FINDINGS) {
    const toolsInvolved = [
      ...new Set(
        failureMemories
          .map((m) => (m.details as Record<string, unknown>)?.tool_name)
          .filter(Boolean),
      ),
    ];

    findings.push({
      severity: 'warning',
      confidence: 0.85,
      summary: `Repeated failure patterns detected (${failureMemories.length} occurrences)`,
      details: `Failure patterns involve: ${toolsInvolved.length > 0 ? toolsInvolved.join(', ') : 'unknown tools'}. Consider alternative approaches or escalation.`,
      recommended_actions:
        toolsInvolved.length > 0
          ? []
          : [
              {
                tool_name: 'create_notification',
                reason: 'Escalate repeated failures to human operator',
                urgency: 'high',
                confidence: 0.8,
              },
            ],
      blocked_reasons: [],
      needed_approvals:
        failureMemories.length >= 3 ? ['human_escalation'] : [],
      dependencies: [],
    });
  }

  // 5. Escalation check: too many exceptions combined with compliance flags
  if (
    unresolvedExceptions >= 3 &&
    complianceFlags.length > 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'critical',
      confidence: 0.95,
      summary: 'Escalation needed: exceptions combined with compliance flags',
      details: `${unresolvedExceptions} exceptions with ${complianceFlags.length} active compliance flags present a compounding risk. Human review is strongly recommended.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Escalate to broker admin for combined exception/compliance review',
          urgency: 'critical',
          confidence: 0.95,
        },
      ],
      blocked_reasons: [
        'Combined exceptions and compliance flags require human intervention',
      ],
      needed_approvals: ['broker_admin_review'],
      dependencies: [],
    });
  }

  const duration = Date.now() - start;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return {
    role: 'exception',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'No exception issues detected.'
        : `Found ${findings.length} exception issue(s): ${criticalCount} critical, ${warningCount} warning(s). ${criticalCount > 0 ? 'Immediate attention required.' : 'Review recommended.'}`,
  };
}

registerSpecialist(contract, execute);
