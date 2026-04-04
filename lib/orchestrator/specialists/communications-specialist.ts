import { registerSpecialist } from './registry';
import type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
} from './types';

const MAX_FINDINGS = 5;

const contract: SpecialistContract = {
  role: 'communications',
  description:
    'Examines stale counterparty responses, waiting states, response obligations, and counterparty responsiveness patterns.',
  allowed_entity_types: ['transaction', 'listing'],
  trigger_conditions: [
    'open_obligations > 0',
    'overdue_obligations > 0',
    'response_latency_signals present',
  ],
  max_findings: MAX_FINDINGS,
  timeout_ms: 5000,
};

async function execute(input: SpecialistInput): Promise<SpecialistOutput> {
  const start = Date.now();
  const findings: SpecialistFinding[] = [];
  const ws = input.worldState;

  const openObligations = (ws.open_obligations as number) ?? 0;
  const overdueObligations = (ws.overdue_obligations as number) ?? 0;
  const latencySignals =
    (ws.response_latency_signals as { waiting_on: string; days_waiting: number }[]) ??
    [];
  const recentCommunications = (ws.recent_communications as number) ?? 0;

  // 1. Overdue obligations — highest priority
  if (overdueObligations > 0) {
    findings.push({
      severity: overdueObligations >= 3 ? 'critical' : 'warning',
      confidence: 0.9,
      summary: `${overdueObligations} overdue obligation(s) need follow-up`,
      details: `There are ${overdueObligations} overdue obligations. These represent commitments that have passed their expected response window and risk stalling the ${input.entityType}.`,
      recommended_actions: [
        {
          tool_name: 'create_reminder_draft',
          reason: 'Draft follow-up for overdue obligations',
          urgency: overdueObligations >= 3 ? 'critical' : 'high',
          confidence: 0.85,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 2. Stale counterparty responses
  const staleSignals = latencySignals.filter((s) => s.days_waiting >= 3);
  if (staleSignals.length > 0 && findings.length < MAX_FINDINGS) {
    const longestWait = staleSignals.reduce(
      (max, s) => (s.days_waiting > max.days_waiting ? s : max),
      staleSignals[0],
    );

    findings.push({
      severity: longestWait.days_waiting >= 7 ? 'critical' : 'warning',
      confidence: 0.85,
      summary: `${staleSignals.length} counterparty response(s) stale (longest: ${longestWait.days_waiting} days waiting on ${longestWait.waiting_on})`,
      details: `Stale responses: ${staleSignals.map((s) => `${s.waiting_on} (${s.days_waiting}d)`).join(', ')}. Prolonged silence may indicate disengagement or missed communications.`,
      recommended_actions: [
        {
          tool_name: 'create_reminder_draft',
          reason: `Follow up with ${longestWait.waiting_on} after ${longestWait.days_waiting} days`,
          urgency: longestWait.days_waiting >= 7 ? 'critical' : 'high',
          confidence: 0.8,
        },
      ],
      blocked_reasons:
        longestWait.days_waiting >= 7
          ? [`Waiting ${longestWait.days_waiting} days on ${longestWait.waiting_on} — potential deal stall`]
          : [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 3. Open obligations without overdue — informational
  if (
    openObligations > 0 &&
    overdueObligations === 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'info',
      confidence: 0.8,
      summary: `${openObligations} open obligation(s) pending response`,
      details: `There are ${openObligations} open obligations awaiting responses. None are overdue yet, but monitoring is recommended.`,
      recommended_actions: [],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 4. Communication vs internal action inference
  if (
    recentCommunications === 0 &&
    openObligations > 0 &&
    findings.length < MAX_FINDINGS
  ) {
    findings.push({
      severity: 'info',
      confidence: 0.7,
      summary: 'No recent communications despite open obligations',
      details:
        'There have been no recent communications while obligations remain open. Consider whether internal action (document preparation, data entry) can unblock progress without waiting for external responses.',
      recommended_actions: [
        {
          tool_name: 'recompute_completeness',
          reason: 'Check if internal actions can advance progress',
          urgency: 'normal',
          confidence: 0.7,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  // 5. Responsiveness pattern detection
  const slowResponders = latencySignals.filter((s) => s.days_waiting >= 5);
  if (slowResponders.length >= 2 && findings.length < MAX_FINDINGS) {
    findings.push({
      severity: 'warning',
      confidence: 0.75,
      summary: 'Pattern of slow counterparty responsiveness detected',
      details: `Multiple parties showing slow response times: ${slowResponders.map((s) => `${s.waiting_on} (${s.days_waiting}d)`).join(', ')}. Consider escalating communication approach or adjusting timelines.`,
      recommended_actions: [
        {
          tool_name: 'create_notification',
          reason: 'Alert operator about responsiveness pattern for strategic decision',
          urgency: 'normal',
          confidence: 0.7,
        },
      ],
      blocked_reasons: [],
      needed_approvals: [],
      dependencies: [],
    });
  }

  const duration = Date.now() - start;

  return {
    role: 'communications',
    invoked_at: new Date(start).toISOString(),
    duration_ms: duration,
    findings: findings.slice(0, MAX_FINDINGS),
    operator_summary:
      findings.length === 0
        ? 'No communication issues detected.'
        : `Found ${findings.length} communication issue(s): ${overdueObligations} overdue, ${staleSignals.length} stale response(s). ${overdueObligations > 0 ? 'Follow-up recommended.' : 'Monitoring.'}`,
  };
}

registerSpecialist(contract, execute);
