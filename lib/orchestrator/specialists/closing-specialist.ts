import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'closing',
  description:
    'Examines closing readiness, title/escrow/lender status, final documents, and economics. Identifies closing blockers and prioritizes close-critical dependencies.',
  allowed_entity_types: ['transaction'],
  trigger_conditions: [
    'stage is under_contract',
    'stage is closing',
  ],
  max_findings: MAX_FINDINGS,
  timeout_ms: 5000,
};

async function execute(input: SpecialistInput): Promise<SpecialistOutput> {
  const start = Date.now();
  const findings: SpecialistFinding[] = [];
  const ws = input.worldState;

  const stage = (ws.stage as string) ?? '';
  const missingDocs = (ws.missing_docs as string[]) ?? [];
  const missingSigs = (ws.missing_signatures as string[]) ?? [];
  const completenessScore = (ws.completeness_score as number) ?? 0;
  const economics = (ws.economics_summary as Record<string, unknown>) ?? null;
  const urgentDeadlines =
    (ws.urgent_deadlines as { description: string; due_at: string; days_remaining: number }[]) ?? [];
  const pendingApprovals = (ws.pending_approvals as number) ?? 0;
  const unresolvedExceptions = (ws.unresolved_exceptions as number) ?? 0;

  const isClosingStage = stage === 'closing';
  const isUnderContract = stage === 'under_contract';

  // 1. Close-critical missing documents
  const closingDocs = missingDocs.filter(
    (d) =>
      d.toLowerCase().includes('title') ||
      d.toLowerCase().includes('escrow') ||
      d.toLowerCase().includes('closing') ||
      d.toLowerCase().includes('deed') ||
      d.toLowerCase().includes('settlement') ||
      d.toLowerCase().includes('hud') ||
      d.toLowerCase().includes('lender'),
  );
  const otherMissingDocs = missingDocs.filter((d) => !closingDocs.includes(d));

  if (closingDocs.length > 0) {
    findings.push({
      severity: isClosingStage ? 'critical' : 'warning',
      confidence: 0.95,
      summary: `${closingDocs.length} close-critical document(s) missing`,
      details: `Missing close-critical documents: ${closingDocs.join(', ')}. ${isClosingStage ? 'These are blocking closing.' : 'These must be obtained before closing can proceed.'}`,
      recommended_actions: [
        {
          tool_name: 'create_document_request',
          reason: 'Request close-critical missing documents',
          urgency: isClosingStage ? 'critical' : 'high',
          confidence: 0.9,
        },
      ],
      blocked_reasons: isClosingStage
        ? closingDocs.map((d) => `Missing close-critical document: ${d}`)
        : [],
      needed_approvals: [],
      dependencies: closingDocs.map((d) => `document:${d}`),
    });
  }

  // 2. Missing signatures at closing
  if (missingSigs.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: isClosingStage ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `${missingSigs.length} signature(s) needed for closing`,
      details: `Missing signatures: ${missingSigs.join(', ')}. ${isClosingStage ? 'Cannot close without all signatures.' : 'Obtain signatures before moving to closing.'}`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Notify parties about required signatures',
          urgency: isClosingStage ? 'critical' : 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons: isClosingStage
        ? missingSigs.map((s) => `Missing signature: ${s}`)
        : [],
      needed_approvals: [],
      dependencies: missingSigs.map((s) => `signature:${s}`),
    });
  }

  // 3. Urgent deadlines approaching
  const closingDeadlines = urgentDeadlines.filter(
    (d) => d.days_remaining <= 3,
  );
  if (closingDeadlines.length > 0 && findings.length < MAX_FINDINGS) {
    const nearest = closingDeadlines.reduce(
      (min, d) => (d.days_remaining < min.days_remaining ? d : min),
      closingDeadlines[0],
    );

    findings.push({
      severity: nearest.days_remaining <= 1 ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `${closingDeadlines.length} urgent deadline(s) within 3 days`,
      details: `Nearest deadline: "${nearest.description}" in ${nearest.days_remaining} day(s) (due ${nearest.due_at}). ${closingDeadlines.length > 1 ? `${closingDeadlines.length - 1} additional deadline(s) also approaching.` : ''}`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: `Urgent: ${nearest.description} due in ${nearest.days_remaining} day(s)`,
          urgency: nearest.days_remaining <= 1 ? 'critical' : 'high',
          confidence: 0.9,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 4. Economics/completeness readiness assessment
  if (isUnderContract && findings.length < MAX_FINDINGS) {
    const readinessIssues: string[] = [];

    if (completenessScore < 70) {
      readinessIssues.push(`Completeness at ${completenessScore}% (need 70%+)`);
    }
    if (!economics) {
      readinessIssues.push('No economics summary available');
    }
    if (unresolvedExceptions > 0) {
      readinessIssues.push(`${unresolvedExceptions} unresolved exception(s)`);
    }
    if (pendingApprovals > 0) {
      readinessIssues.push(`${pendingApprovals} pending approval(s)`);
    }
    if (otherMissingDocs.length > 0) {
      readinessIssues.push(`${otherMissingDocs.length} other missing document(s)`);
    }

    if (readinessIssues.length > 0) {
      findings.push({
        severity: readinessIssues.length >= 3 ? 'warning' : 'info',
        confidence: 0.85,
        summary: `Closing readiness: ${readinessIssues.length} issue(s) to resolve`,
        details: `Before this transaction can move to closing: ${readinessIssues.join('; ')}.`,
        recommended_actions: [
          {
            tool_name: 'recompute_completeness',
            reason: 'Recompute to get updated readiness assessment',
            urgency: 'normal',
            confidence: 0.8,
          },
        ],
        blocked_reasons: [],
        needed_approvals: [],
        dependencies: [],
      });
    }
  }

  // 5. Closing preparation suggestion when ready
  if (
    isUnderContract &&
    completenessScore >= 80 &&
    missingDocs.length === 0 &&
    unresolvedExceptions === 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'info',
      confidence: 0.85,
      summary: 'Transaction may be ready to move to closing stage',
      details: `Completeness is at ${completenessScore}% with no missing documents or unresolved exceptions. Consider initiating closing preparation.`,
      recommended_actions: [
        {
          tool_name: 'suggest_stage_transition',
          reason: 'Transaction appears ready for closing stage',
          urgency: 'normal',
          confidence: 0.8,
        },
      ],
      blocked_reasons: [],
      needed_approvals: pendingApprovals > 0 ? ['pending_approvals'] : [],
      dependencies: missingSigs.length > 0 ? missingSigs.map((s) => `signature:${s}`) : [],
    });
  }

  const duration = Date.now() - start;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;

  return {
    role: 'closing',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'No closing blockers detected. Transaction is progressing.'
        : `Found ${findings.length} closing concern(s): ${criticalCount} critical. ${closingDocs.length > 0 ? `${closingDocs.length} close-critical doc(s) missing.` : ''} ${criticalCount > 0 ? 'Blocking issues must be resolved.' : 'Review recommended.'}`,
  };
}

registerSpecialist(contract, execute);
