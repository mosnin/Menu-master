import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'listing',
  description:
    'Examines listing completeness, launch readiness, seller inputs, and offer context. Identifies listing blockers and missing seller inputs.',
  allowed_entity_types: ['listing'],
  trigger_conditions: [
    'entity_type is listing',
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
  const pendingApprovals = (ws.pending_approvals as number) ?? 0;
  const complianceFlags = (ws.compliance_flags as string[]) ?? [];
  const readiness = (ws.readiness as string) ?? '';

  // Identify listing-specific missing items
  const listingDocs = missingDocs.filter(
    (d) =>
      d.toLowerCase().includes('listing') ||
      d.toLowerCase().includes('disclosure') ||
      d.toLowerCase().includes('photo') ||
      d.toLowerCase().includes('mls') ||
      d.toLowerCase().includes('seller') ||
      d.toLowerCase().includes('property'),
  );
  const otherDocs = missingDocs.filter((d) => !listingDocs.includes(d));

  // 1. Low completeness — listing blockers
  if (completenessScore < 50) {
    findings.push({
      severity: 'warning',
      confidence: 0.9,
      summary: `Listing completeness is low at ${completenessScore}%`,
      details: `The listing is only ${completenessScore}% complete. Significant data and documentation gaps exist that must be addressed before launch.`,
      recommended_actions: [
        {
          tool_name: 'recompute_completeness',
          reason: 'Get detailed breakdown of missing listing requirements',
          urgency: 'high',
          confidence: 0.9,
        },
      ],
      blocked_reasons:
        completenessScore < 30
          ? ['Listing completeness too low for any progression']
          : [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 2. Missing listing-specific documents (seller inputs)
  if (listingDocs.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: listingDocs.length >= 3 ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `${listingDocs.length} listing-critical document(s) missing`,
      details: `Missing listing documents: ${listingDocs.join(', ')}. These are typically seller-provided inputs required for launch.`,
      recommended_actions: [
        {
          tool_name: 'create_document_request',
          reason: 'Request missing listing documents from seller',
          urgency: 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: listingDocs.map((d) => `document:${d}`),
    });
  }

  // 3. Missing signatures (listing agreements)
  if (missingSigs.length > 0 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'warning',
      confidence: 0.85,
      summary: `${missingSigs.length} signature(s) needed for listing`,
      details: `Missing signatures: ${missingSigs.join(', ')}. Listing agreements and disclosures require signatures before the listing can be launched.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Notify parties about required listing signatures',
          urgency: 'high',
          confidence: 0.8,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: missingSigs.map((s) => `signature:${s}`),
    });
  }

  // 4. Launch readiness assessment
  const isPreLaunch =
    stage === 'draft' ||
    stage === 'pre_launch' ||
    stage === 'preparation' ||
    stage === 'pre_listing';

  if (isPreLaunch && findings.length < MAX_FINDINGS) {
    const launchBlockers: string[] = [];

    if (completenessScore < 80) {
      launchBlockers.push(`Completeness at ${completenessScore}% (need 80%+)`);
    }
    if (listingDocs.length > 0) {
      launchBlockers.push(`${listingDocs.length} listing doc(s) missing`);
    }
    if (otherDocs.length > 0) {
      launchBlockers.push(`${otherDocs.length} other doc(s) missing`);
    }
    if (missingSigs.length > 0) {
      launchBlockers.push(`${missingSigs.length} signature(s) missing`);
    }
    if (complianceFlags.length > 0) {
      launchBlockers.push(`${complianceFlags.length} compliance flag(s)`);
    }
    if (pendingApprovals > 0) {
      launchBlockers.push(`${pendingApprovals} approval(s) pending`);
    }

    if (launchBlockers.length > 0) {
      findings.push({
        severity: launchBlockers.length >= 3 ? 'warning' : 'info',
        confidence: 0.85,
        summary: `Launch readiness: ${launchBlockers.length} blocker(s) remain`,
        details: `Before this listing can launch: ${launchBlockers.join('; ')}.`,
        recommended_actions: [],
        blocked_reasons: [],
        needed_approvals: [],
        dependencies: [],
      });
    } else {
      findings.push({
        severity: 'info',
        confidence: 0.85,
        summary: 'Listing appears ready for launch',
        details: `Completeness is at ${completenessScore}% with no missing documents, signatures, or compliance flags. Consider initiating launch.`,
        recommended_actions: [
          {
            tool_name: 'suggest_stage_transition',
            reason: 'Listing appears ready to transition to active/launched stage',
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

  // 5. Active listing with offer context
  const isActive = stage === 'active' || stage === 'launched' || stage === 'live';
  if (isActive && readiness && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'info',
      confidence: 0.75,
      summary: `Listing is active (readiness: ${readiness})`,
      details:
        'Listing is live. Monitor for incoming offers and ensure all listing details remain current.',
      recommended_actions: [],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  const duration = Date.now() - start;

  return {
    role: 'listing',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'Listing is in good shape. No issues detected.'
        : `Found ${findings.length} listing concern(s). Completeness: ${completenessScore}%. ${listingDocs.length > 0 ? `${listingDocs.length} listing doc(s) missing.` : ''} ${isPreLaunch ? 'Pre-launch review needed.' : ''}`,
  };
}

registerSpecialist(contract, execute);
