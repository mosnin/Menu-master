import * as runRepo from '@/lib/repositories/workflow-runs';
import * as traceRepo from '@/lib/repositories/automation-trace-events';
import * as workflowRepo from '@/lib/repositories/workflows';
import * as versionRepo from '@/lib/repositories/workflow-versions';
import * as economicsRepo from '@/lib/repositories/workflow-economics';
import * as officeMembershipRepo from '@/lib/repositories/office-memberships';

const DEFAULT_MINUTES_PER_ACTION: Record<string, number> = {
  auto_execute: 4,
  create_draft: 3,
  create_approval: 1,
  create_notification: 2,
  create_checklist_item: 3,
  create_timeline_event: 3,
};

export function estimateTimeSavedForTrace(input: {
  disposition: string | null;
  toolName: string | null;
  wasOverride: boolean;
  hadCorrection: boolean;
}) {
  const baseline = DEFAULT_MINUTES_PER_ACTION[input.disposition ?? '']
    ?? DEFAULT_MINUTES_PER_ACTION[input.toolName ?? '']
    ?? 2;

  const gross = baseline;
  const reviewCost = input.disposition === 'create_approval' ? 1.5 : 0.5;
  const correctionCost = input.hadCorrection ? 2 : 0;
  const overrideCost = input.wasOverride ? 1.5 : 0;
  const net = Math.max(0, gross - reviewCost - correctionCost - overrideCost);

  return {
    grossMinutesSaved: gross,
    netMinutesSaved: net,
    reviewMinutesCost: reviewCost,
    correctionMinutesCost: correctionCost + overrideCost,
    confidence: gross >= 4 ? 'medium' : 'low' as const,
  };
}

export function detectNegativeValueSignals(input: {
  overrideRate: number;
  correctionRate: number;
  failureRate: number;
  runVolume: number;
  netMinutesSaved: number;
  costUnits: number;
}) {
  const signals: Array<{ signalType: 'high_override_rate' | 'high_correction_rate' | 'high_failure_rate' | 'low_usage' | 'low_value_relative_to_burden'; severity: 'warning' | 'major' | 'critical'; recommendation: 'review' | 'simplify' | 'deprecate' | 'assist_only'; details: string; metricValue: number; thresholdValue: number }> = [];

  if (input.overrideRate > 0.25) {
    signals.push({ signalType: 'high_override_rate', severity: input.overrideRate > 0.4 ? 'critical' : 'major', recommendation: 'review', details: 'Override rate indicates automation frequently requires manual takeover.', metricValue: input.overrideRate, thresholdValue: 0.25 });
  }
  if (input.correctionRate > 0.2) {
    signals.push({ signalType: 'high_correction_rate', severity: input.correctionRate > 0.35 ? 'critical' : 'major', recommendation: 'simplify', details: 'Correction burden suggests churn-heavy automation output.', metricValue: input.correctionRate, thresholdValue: 0.2 });
  }
  if (input.failureRate > 0.15) {
    signals.push({ signalType: 'high_failure_rate', severity: input.failureRate > 0.3 ? 'critical' : 'major', recommendation: 'review', details: 'Failure burden reduces economic utility and increases follow-up load.', metricValue: input.failureRate, thresholdValue: 0.15 });
  }
  if (input.runVolume < 3) {
    signals.push({ signalType: 'low_usage', severity: 'warning', recommendation: 'review', details: 'Low usage may indicate poor adoption or poor fit for workflow automation.', metricValue: input.runVolume, thresholdValue: 3 });
  }
  if (input.netMinutesSaved < input.costUnits) {
    signals.push({ signalType: 'low_value_relative_to_burden', severity: 'major', recommendation: 'assist_only', details: 'Estimated cost burden exceeds net time-saved benefit.', metricValue: input.netMinutesSaved - input.costUnits, thresholdValue: 0 });
  }

  return signals;
}

export async function buildAutomationEconomics(input: { orgId: string; windowDays?: number }) {
  const windowDays = input.windowDays ?? 30;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = now.toISOString();

  const workflows = await workflowRepo.findByOrgId(input.orgId);
  const summaries: any[] = [];

  for (const workflow of workflows) {
    const versions = await versionRepo.findByWorkflowId(workflow.id);
    const latestVersion = versions[0];
    const runs = (await runRepo.findByWorkflowId(workflow.id, { limit: 500 })).filter((run) => run.created_at >= windowStart);
    const traces = (await Promise.all(runs.slice(0, 200).map((run) => traceRepo.findByWorkflowRun(run.id)))).flat();

    const runVolume = runs.length;
    const successRate = runVolume > 0 ? runs.filter((run) => run.status === 'completed').length / runVolume : 0;
    const failureRate = runVolume > 0 ? runs.filter((run) => run.status === 'failed').length / runVolume : 0;

    const overrideCount = traces.filter((trace) => trace.policy_disposition === 'create_approval' || trace.status === 'create_approval').length;
    const correctionCount = traces.filter((trace) => `${trace.outcome_summary ?? ''}`.toLowerCase().includes('correction')).length;
    const overrideRate = runVolume > 0 ? overrideCount / runVolume : 0;
    const correctionRate = runVolume > 0 ? correctionCount / runVolume : 0;

    const timeBreakdown = traces.reduce((acc, trace) => {
      const estimate = estimateTimeSavedForTrace({
        disposition: trace.policy_disposition,
        toolName: trace.tool_name,
        wasOverride: trace.policy_disposition === 'create_approval',
        hadCorrection: `${trace.outcome_summary ?? ''}`.toLowerCase().includes('correction'),
      });
      acc.gross += estimate.grossMinutesSaved;
      acc.net += estimate.netMinutesSaved;
      acc.review += estimate.reviewMinutesCost;
      acc.correction += estimate.correctionMinutesCost;
      return acc;
    }, { gross: 0, net: 0, review: 0, correction: 0 });

    const costUnits = runVolume * 0.8 + traces.length * 0.2 + (failureRate * runVolume * 2);

    await economicsRepo.insertTimeSavedEstimate({
      organization_id: input.orgId,
      action_type: 'workflow_execution',
      scope_type: 'workflow',
      scope_ref: workflow.id,
      gross_minutes_saved: timeBreakdown.gross,
      review_minutes_cost: timeBreakdown.review,
      correction_minutes_cost: timeBreakdown.correction,
      net_minutes_saved: timeBreakdown.net,
      assumption_key: 'minutes_per_action',
      assumption_value: 2,
      confidence: runVolume > 20 ? 'high' : runVolume > 8 ? 'medium' : 'low',
      window_start: windowStart,
      window_end: windowEnd,
    });

    await economicsRepo.insertManualDisplacement({
      organization_id: input.orgId,
      workflow_id: workflow.id,
      workflow_version_id: latestVersion?.id ?? null,
      fully_automated_count: traces.filter((trace) => trace.policy_disposition === 'auto_execute').length,
      assisted_count: traces.filter((trace) => trace.policy_disposition === 'create_draft').length,
      review_required_count: traces.filter((trace) => trace.policy_disposition === 'create_approval').length,
      override_count: overrideCount,
      correction_count: correctionCount,
      avoided_manual_steps: traces.filter((trace) => trace.status === 'executed').length,
      window_start: windowStart,
      window_end: windowEnd,
      office_id: null,
      team_id: null,
    });

    await economicsRepo.insertCostSignal({
      organization_id: input.orgId,
      scope_type: 'workflow',
      scope_ref: workflow.id,
      workflow_execution_volume: runVolume,
      simulation_volume: 0,
      nl_generation_volume: 0,
      agent_node_usage: traces.filter((trace) => `${trace.tool_name ?? ''}`.includes('agent')).length,
      retry_overhead: traces.filter((trace) => `${trace.outcome_summary ?? ''}`.toLowerCase().includes('retry')).length,
      failure_overhead: runs.filter((run) => run.status === 'failed').length,
      override_burden: overrideCount,
      estimated_cost_units: costUnits,
      window_start: windowStart,
      window_end: windowEnd,
    });

    const roi = await economicsRepo.upsertRoiSummary({
      organization_id: input.orgId,
      asset_type: 'workflow',
      asset_ref: workflow.id,
      run_volume: runVolume,
      success_rate: successRate,
      override_rate: overrideRate,
      correction_burden_rate: correctionRate,
      gross_minutes_saved: timeBreakdown.gross,
      net_minutes_saved: timeBreakdown.net,
      estimated_value_score: Math.max(0, timeBreakdown.net - costUnits),
      confidence: runVolume > 20 ? 'high' : runVolume > 8 ? 'medium' : 'low',
      assumptions_json: {
        minutes_per_action_default: 2,
        review_cost_minutes: 1.5,
      },
      window_start: windowStart,
      window_end: windowEnd,
    });

    const negatives = detectNegativeValueSignals({
      overrideRate,
      correctionRate,
      failureRate,
      runVolume,
      netMinutesSaved: timeBreakdown.net,
      costUnits,
    });

    for (const negative of negatives) {
      await economicsRepo.insertNegativeSignal({
        organization_id: input.orgId,
        asset_type: 'workflow',
        asset_ref: workflow.id,
        signal_type: negative.signalType,
        severity: negative.severity,
        recommendation: negative.recommendation,
        details: negative.details,
        metric_value: negative.metricValue,
        threshold_value: negative.thresholdValue,
        window_start: windowStart,
        window_end: windowEnd,
      });
    }

    for (const trace of traces.slice(0, 300)) {
      await economicsRepo.createValueRecord({
        organization_id: input.orgId,
        asset_type: 'workflow',
        asset_ref: workflow.id,
        value_category: mapTraceToValueCategory(trace.policy_disposition),
        source_table: 'automation_trace_events',
        source_record_id: trace.id,
        measured_value: 1,
        estimated_minutes_saved: estimateTimeSavedForTrace({
          disposition: trace.policy_disposition,
          toolName: trace.tool_name,
          wasOverride: trace.policy_disposition === 'create_approval',
          hadCorrection: `${trace.outcome_summary ?? ''}`.toLowerCase().includes('correction'),
        }).netMinutesSaved,
        confidence: runVolume > 20 ? 'high' : 'medium',
        assumptions_json: { source: 'trace_event_heuristic' },
      });
    }

    summaries.push(roi);
  }

  const officeMemberships = await officeMembershipRepo.findByUserId('00000000-0000-0000-0000-000000000000').catch(() => []);

  const orgSummary = await economicsRepo.upsertRoiSummary({
    organization_id: input.orgId,
    asset_type: 'organization',
    asset_ref: input.orgId,
    run_volume: summaries.reduce((acc, row) => acc + Number(row.run_volume ?? 0), 0),
    success_rate: summaries.length > 0 ? summaries.reduce((acc, row) => acc + Number(row.success_rate ?? 0), 0) / summaries.length : 0,
    override_rate: summaries.length > 0 ? summaries.reduce((acc, row) => acc + Number(row.override_rate ?? 0), 0) / summaries.length : 0,
    correction_burden_rate: summaries.length > 0 ? summaries.reduce((acc, row) => acc + Number(row.correction_burden_rate ?? 0), 0) / summaries.length : 0,
    gross_minutes_saved: summaries.reduce((acc, row) => acc + Number(row.gross_minutes_saved ?? 0), 0),
    net_minutes_saved: summaries.reduce((acc, row) => acc + Number(row.net_minutes_saved ?? 0), 0),
    estimated_value_score: summaries.reduce((acc, row) => acc + Number(row.estimated_value_score ?? 0), 0),
    confidence: summaries.length > 8 ? 'high' : summaries.length > 3 ? 'medium' : 'low',
    assumptions_json: { model: 'workflow_aggregate_v1', office_membership_rows_checked: officeMemberships.length },
    window_start: windowStart,
    window_end: windowEnd,
  });

  return { workflowSummaries: summaries, organizationSummary: orgSummary };
}

export async function getEconomicsOverview(orgId: string) {
  const [roi, negatives, values] = await Promise.all([
    economicsRepo.listRoiSummaries(orgId, { limit: 200 }),
    economicsRepo.listNegativeSignals(orgId, 200),
    economicsRepo.listValueRecords(orgId, 300),
  ]);

  const workflowRoi = roi.filter((row) => row.asset_type === 'workflow');
  const topValue = [...workflowRoi].sort((a, b) => Number(b.estimated_value_score) - Number(a.estimated_value_score)).slice(0, 8);

  return {
    summary: {
      workflowCount: workflowRoi.length,
      totalNetMinutesSaved: workflowRoi.reduce((acc, row) => acc + Number(row.net_minutes_saved), 0),
      totalGrossMinutesSaved: workflowRoi.reduce((acc, row) => acc + Number(row.gross_minutes_saved), 0),
      averageOverrideRate: workflowRoi.length > 0 ? workflowRoi.reduce((acc, row) => acc + Number(row.override_rate), 0) / workflowRoi.length : 0,
      negativeSignalCount: negatives.length,
      lowValueWorkflowCount: negatives.filter((signal) => signal.signal_type === 'low_value_relative_to_burden').length,
    },
    topValue,
    negatives,
    valueRecords: values,
  };
}

function mapTraceToValueCategory(policyDisposition: string | null): 'manual_step_avoided' | 'review_time_saved' | 'coordination_time_saved' | 'follow_up_time_saved' | 'queue_reduction' | 'reduced_delay_risk' | 'reduced_manual_rework' | 'reduced_override_load' {
  if (policyDisposition === 'auto_execute') return 'manual_step_avoided';
  if (policyDisposition === 'create_draft') return 'review_time_saved';
  if (policyDisposition === 'create_approval') return 'reduced_override_load';
  return 'coordination_time_saved';
}
