import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'compliance',
  description:
    'Examines compliance flags, policy-sensitive actions, and stage changes. Detects policy risks and recommends review gates.',
  allowed_entity_types: ['transaction', 'listing'],
  trigger_conditions: [
    'compliance_flags present',
    'stage transition proposed',
    'high_risk actions in recent actions',
  ],
  max_findings: MAX_FINDINGS,
  timeout_ms: 5000,
};

async function execute(input: SpecialistInput): Promise<SpecialistOutput> {
  const start = Date.now();
  const findings: SpecialistFinding[] = [];
  const ws = input.worldState;

  const complianceFlags = (ws.compliance_flags as string[]) ?? [];
  const missingDocs = (ws.missing_docs as string[]) ?? [];
  const missingSigs = (ws.missing_signatures as string[]) ?? [];
  const pendingApprovals = (ws.pending_approvals as number) ?? 0;
  const stage = (ws.stage as string) ?? '';

  // 1. Active compliance flags
  if (complianceFlags.length > 0) {
    const severity = complianceFlags.length >= 3 ? 'critical' : 'warning';

    findings.push({
      severity,
      confidence: 0.95,
      summary: `${complianceFlags.length} active compliance flag(s)`,
      details: `Active flags: ${complianceFlags.join(', ')}. All non-safe actions should be held until flags are resolved or explicitly approved.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Notify compliance team of active flags',
          urgency: severity === 'critical' ? 'critical' : 'high',
          confidence: 0.9,
        },
      ],
      blocked_reasons: complianceFlags.map(
        (f) => `Compliance flag: ${f}`,
      ),
      needed_approvals: ['compliance_review'],
      dependencies: [],
    });
  }

  // 2. Stage transition with missing documentation
  const stageTransitionProposed = input.recentActions.some(
    (a) =>
      a.includes('stage_transition') || a.includes('suggest_stage_transition'),
  );

  if (stageTransitionProposed && missingDocs.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'critical',
      confidence: 0.95,
      summary: 'Stage transition proposed with missing documentation',
      details: `A stage transition has been proposed but ${missingDocs.length} document(s) are still missing: ${missingDocs.join(', ')}. This is a compliance risk.`,
      recommended_actions: [
        {
          tool_name: 'create_document_request',
          reason: 'Request missing documents before stage transition',
          urgency: 'critical',
          confidence: 0.9,
        },
      ],
      blocked_reasons: missingDocs.map(
        (d) => `Missing required document: ${d}`,
      ),
      needed_approvals: ['broker_admin_review'],
      dependencies: missingDocs.map((d) => `document:${d}`),
    });
  }

  // 3. Missing signatures — policy risk
  if (missingSigs.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: missingSigs.length >= 3 ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `${missingSigs.length} missing signature(s)`,
      details: `Missing signatures: ${missingSigs.join(', ')}. Transactions cannot close without all required signatures.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Notify parties about missing signatures',
          urgency: 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons:
        stage === 'closing'
          ? missingSigs.map((s) => `Missing signature: ${s}`)
          : [],
      needed_approvals: [],
      dependencies: missingSigs.map((s) => `signature:${s}`),
    });
  }

  // 4. Pending approvals gate
  if (pendingApprovals > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: pendingApprovals >= 3 ? 'warning' : 'info',
      confidence: 0.85,
      summary: `${pendingApprovals} pending approval(s) act as review gates`,
      details: `There are ${pendingApprovals} approvals pending. Progress on gated actions should wait until approvals are obtained.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Remind approvers of pending approvals',
          urgency: pendingApprovals >= 3 ? 'high' : 'normal',
          confidence: 0.8,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 5. High-risk actions in recent history with compliance flags
  const highRiskRecent = input.recentActions.filter(
    (a) => a.includes('high_risk') || a.includes('override'),
  );
  if (
    highRiskRecent.length > 0 &&
    complianceFlags.length > 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'critical',
      confidence: 0.9,
      summary: 'High-risk actions taken while compliance flags are active',
      details: `${highRiskRecent.length} high-risk action(s) have been executed recently while ${complianceFlags.length} compliance flag(s) are active. This may require audit review.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Flag for compliance audit: high-risk actions during flagged state',
          urgency: 'critical',
          confidence: 0.95,
        },
      ],
      blocked_reasons: ['High-risk actions during flagged compliance state'],
      needed_approvals: ['compliance_audit'],
      dependencies: [],
    });
  }

  const duration = Date.now() - start;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;

  return {
    role: 'compliance',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'No compliance concerns detected.'
        : `Found ${findings.length} compliance concern(s): ${criticalCount} critical. ${complianceFlags.length > 0 ? `Active flags: ${complianceFlags.join(', ')}.` : ''} ${criticalCount > 0 ? 'Human review required.' : 'Monitoring.'}`,
  };
}

registerSpecialist(contract, execute);
