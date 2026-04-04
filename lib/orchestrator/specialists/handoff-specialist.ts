import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'handoff',
  description:
    'Examines accepted offer data and lifecycle transition state. Evaluates handoff readiness from listing to transaction, detects missing context, and suggests clean carry-forward of data and tasks.',
  allowed_entity_types: ['listing'],
  trigger_conditions: [
    'entity_type is listing and offer has been accepted',
    'stage indicates offer_accepted or pending_handoff',
  ],
  max_findings: MAX_FINDINGS,
  timeout_ms: 5000,
};

async function execute(input: SpecialistInput): Promise<SpecialistOutput> {
  const start = Date.now();
  const findings: SpecialistFinding[] = [];
  const ws = input.worldState;

  const stage = (ws.stage as string) ?? '';
  const completenessScore = (ws.completeness_score as number) ?? 0;
  const missingDocs = (ws.missing_docs as string[]) ?? [];
  const missingSigs = (ws.missing_signatures as string[]) ?? [];
  const economics = (ws.economics_summary as Record<string, unknown>) ?? null;
  const complianceFlags = (ws.compliance_flags as string[]) ?? [];
  const unresolvedExceptions = (ws.unresolved_exceptions as number) ?? 0;
  const assignments = (ws.assignments as { user_id: string; role: string }[]) ?? [];
  const ownership = (ws.ownership as { owner_id: string | null; owner_role: string | null }) ?? {
    owner_id: null,
    owner_role: null,
  };

  // 1. Handoff readiness evaluation
  const handoffBlockers: string[] = [];

  if (missingDocs.length > 0) {
    handoffBlockers.push(`${missingDocs.length} document(s) still missing`);
  }
  if (missingSigs.length > 0) {
    handoffBlockers.push(`${missingSigs.length} signature(s) still missing`);
  }
  if (complianceFlags.length > 0) {
    handoffBlockers.push(`${complianceFlags.length} compliance flag(s) active`);
  }
  if (unresolvedExceptions > 0) {
    handoffBlockers.push(`${unresolvedExceptions} unresolved exception(s)`);
  }
  if (!economics) {
    handoffBlockers.push('No economics summary — offer terms may not be captured');
  }

  if (handoffBlockers.length > 0) {
    findings.push({
      severity: handoffBlockers.length >= 3 ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `Handoff readiness: ${handoffBlockers.length} blocker(s) detected`,
      details: `Before handing off from listing to transaction: ${handoffBlockers.join('; ')}. These issues should be resolved to ensure a clean transition.`,
      recommended_actions:
        missingDocs.length > 0
          ? [
              {
                tool_name: 'create_document_request',
                reason: 'Collect missing documents before handoff',
                urgency: 'high',
                confidence: 0.85,
              },
            ]
          : [
              {
                tool_name: 'recompute_completeness',
                reason: 'Re-evaluate completeness before handoff',
                urgency: 'high',
                confidence: 0.8,
              },
            ],
      blocked_reasons: handoffBlockers,
      needed_approvals:
        complianceFlags.length > 0 ? ['compliance_review'] : [],
      dependencies: [
        ...missingDocs.map((d) => `document:${d}`),
        ...missingSigs.map((s) => `signature:${s}`),
      ],
    });
  } else {
    findings.push({
      severity: 'info',
      confidence: 0.9,
      summary: 'Listing is ready for handoff to transaction',
      details: `Completeness at ${completenessScore}% with no blockers. The listing can be cleanly transitioned to a transaction record.`,
      recommended_actions: [
        {
          tool_name: 'suggest_stage_transition',
          reason: 'Initiate handoff from listing to transaction',
          urgency: 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 2. Missing context detection — data that must carry forward
  const missingContext: string[] = [];

  if (!economics) {
    missingContext.push('economics/offer terms');
  }
  if (!ownership.owner_id) {
    missingContext.push('ownership assignment');
  }
  if (assignments.length === 0) {
    missingContext.push('role assignments');
  }
  if (completenessScore < 50) {
    missingContext.push('listing data (completeness below 50%)');
  }

  if (missingContext.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: missingContext.length >= 3 ? 'critical' : 'warning',
      confidence: 0.85,
      summary: `${missingContext.length} context gap(s) will impact transaction creation`,
      details: `Missing context for carry-forward: ${missingContext.join(', ')}. These data points are needed for the new transaction record to be functional.`,
      recommended_actions: [
        {
          tool_name: 'recompute_completeness',
          reason: 'Identify all missing data points for carry-forward',
          urgency: 'high',
          confidence: 0.8,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: missingContext.map((c) => `context:${c}`),
    });
  }

  // 3. Assignment carry-forward check
  if (assignments.length > 0 && findings.length < MAX_FINDINGS) {
    const hasAgent = assignments.some(
      (a) => a.role === 'agent' || a.role === 'listing_agent',
    );
    const hasCoordinator = assignments.some(
      (a) => a.role === 'coordinator' || a.role === 'transaction_coordinator',
    );

    if (!hasAgent || !hasCoordinator) {
      const missingRoles: string[] = [];
      if (!hasAgent) missingRoles.push('agent');
      if (!hasCoordinator) missingRoles.push('coordinator');

      findings.push({
        severity: 'warning',
        confidence: 0.8,
        summary: `Missing role assignment(s) for transaction: ${missingRoles.join(', ')}`,
        details: `The new transaction will need these roles assigned: ${missingRoles.join(', ')}. Ensure proper assignment during or immediately after handoff.`,
        recommended_actions: [
          {
            tool_name: 'create_notification',
            reason: `Assign ${missingRoles.join(' and ')} role(s) for new transaction`,
            urgency: 'normal',
            confidence: 0.75,
          },
        ],
        blocked_reasons: [],
        needed_approvals: [],
        dependencies: missingRoles.map((r) => `role:${r}`),
      });
    }
  }

  // 4. Stale listing data warning
  const recentUploads = (ws.recent_uploads as number) ?? 0;
  if (
    recentUploads === 0 &&
    completenessScore < 80 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'info',
      confidence: 0.7,
      summary: 'No recent uploads — listing data may be stale',
      details:
        'There have been no recent document uploads and completeness is below 80%. Verify that listing data is current before carrying it forward to a transaction.',
      recommended_actions: [],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 5. Clean handoff summary
  if (
    handoffBlockers.length === 0 &&
    missingContext.length === 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'info',
      confidence: 0.9,
      summary: 'Clean handoff is possible',
      details: `All data, documents, and assignments appear ready for carry-forward. Economics captured: ${economics ? 'yes' : 'no'}. Assignments: ${assignments.length}. Completeness: ${completenessScore}%.`,
      recommended_actions: [
        {
          tool_name: 'suggest_stage_transition',
          reason: 'Proceed with listing-to-transaction handoff',
          urgency: 'normal',
          confidence: 0.85,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  const duration = Date.now() - start;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;

  return {
    role: 'handoff',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'Handoff evaluation complete. No issues detected.'
        : `Handoff evaluation: ${findings.length} finding(s), ${criticalCount} critical. ${handoffBlockers.length > 0 ? `${handoffBlockers.length} blocker(s) to resolve.` : 'Ready for handoff.'}`,
  };
}

registerSpecialist(contract, execute);
