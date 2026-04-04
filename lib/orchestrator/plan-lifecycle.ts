import type {
  WorldStateSnapshot,
  OrchestratorPlan,
  OrchestratorSubgoal,
  PlanProgress,
  PlanStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Plan Refresh Context
// ---------------------------------------------------------------------------

/**
 * All the information needed to decide what the orchestrator should do with
 * its plan on this cycle.
 */
export interface PlanRefreshContext {
  orchestratorId: string;
  organizationId: string;
  entityType: 'transaction' | 'listing';
  entityId: string;
  currentPlan: OrchestratorPlan | null;
  worldState: WorldStateSnapshot;
  unresolvedBlockers: string[];
  recentFailures: string[];
  deadlines: { description: string; due_at: string; days_remaining: number }[];
  waitingStates: string[];
}

export type PlanAction =
  | 'continue'
  | 'create_plan'
  | 'replan'
  | 'block_plan'
  | 'complete_plan'
  | 'wait';

// ---------------------------------------------------------------------------
// Terminal stages — entities that reached an end state need no further planning
// ---------------------------------------------------------------------------

const TERMINAL_STAGES = new Set([
  'closed',
  'cancelled',
  'terminated',
  'launched',
  'sold',
  'withdrawn',
  'expired',
  'completed',
  'archived',
]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate the current plan state and determine what the cycle should do.
 * This is the single decision function called at the start of every cycle.
 */
export function evaluatePlanAction(
  ctx: PlanRefreshContext,
): { action: PlanAction; reason: string } {
  // Order matters: check terminal conditions first, then blocking, then
  // completion, then replanning, then creation, then waiting.

  // 1. Complete?
  if (shouldCompletePlan(ctx)) {
    return {
      action: 'complete_plan',
      reason: buildCompletionReason(ctx),
    };
  }

  // 2. Block?
  if (shouldBlockPlan(ctx)) {
    return {
      action: 'block_plan',
      reason: buildBlockReason(ctx),
    };
  }

  // 3. No plan yet — create one?
  if (shouldCreatePlan(ctx)) {
    return {
      action: 'create_plan',
      reason: 'No active plan and meaningful work remains on this entity.',
    };
  }

  // 4. Existing plan needs refresh?
  if (shouldReplan(ctx)) {
    return {
      action: 'replan',
      reason: buildReplanReason(ctx),
    };
  }

  // 5. If we have a plan, continue; otherwise wait
  if (ctx.currentPlan && ['active', 'draft', 'waiting'].includes(ctx.currentPlan.status)) {
    return { action: 'continue', reason: 'Active plan exists; no refresh needed.' };
  }

  return { action: 'wait', reason: 'No actionable work detected this cycle.' };
}

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

function shouldCreatePlan(ctx: PlanRefreshContext): boolean {
  // Already have an active plan — nothing to create
  if (
    ctx.currentPlan &&
    ['active', 'draft', 'waiting', 'blocked'].includes(ctx.currentPlan.status)
  ) {
    return false;
  }

  // Entity is in a terminal stage — no plan needed
  if (TERMINAL_STAGES.has(ctx.worldState.stage)) {
    return false;
  }

  // Meaningful work remains if any of these are true:
  const hasMissingDocs = ctx.worldState.missing_docs.length > 0;
  const hasLowCompleteness = ctx.worldState.completeness_score < 80;
  const hasPendingApprovals = ctx.worldState.pending_approvals > 0;
  const hasUnresolvedExceptions = ctx.worldState.unresolved_exceptions > 0;
  const hasOverdueObligations = ctx.worldState.overdue_obligations > 0;
  const hasOpenObligations = ctx.worldState.open_obligations > 0;
  const hasComplianceFlags = ctx.worldState.compliance_flags.length > 0;
  const hasUrgentDeadlines = ctx.deadlines.length > 0;
  const hasMissingSignatures = ctx.worldState.missing_signatures.length > 0;

  return (
    hasMissingDocs ||
    hasLowCompleteness ||
    hasPendingApprovals ||
    hasUnresolvedExceptions ||
    hasOverdueObligations ||
    hasOpenObligations ||
    hasComplianceFlags ||
    hasUrgentDeadlines ||
    hasMissingSignatures
  );
}

function shouldReplan(ctx: PlanRefreshContext): boolean {
  const plan = ctx.currentPlan;
  if (!plan || !['active', 'waiting'].includes(plan.status)) {
    return false;
  }

  // Check if plan is stale (older than review_cadence_hours)
  const planAgeHours =
    (Date.now() - new Date(plan.updated_at).getTime()) / (1000 * 60 * 60);
  if (planAgeHours > plan.review_cadence_hours) {
    return true;
  }

  // A subgoal has been blocked for more than 24 hours (signalled via waitingStates)
  if (ctx.waitingStates.length > 0) {
    // waitingStates are subgoal descriptions that have been waiting — if any
    // have been present across multiple cycles, treat as stale. For now, any
    // waiting state signals potential need to replan.
    return true;
  }

  // Major milestone reached — stage changed since plan was created
  // We infer this if the world state stage differs from the plan's title/objective
  // (a rough heuristic — the planner embeds the stage in the objective).
  // More concretely: if recent uploads or corrections happened, the world changed.
  if (ctx.worldState.recent_uploads > 0 || ctx.worldState.recent_corrections > 0) {
    return true;
  }

  // Recent failures suggest the current plan's actions are not working
  if (ctx.recentFailures.length >= 2) {
    return true;
  }

  return false;
}

function shouldBlockPlan(ctx: PlanRefreshContext): boolean {
  const plan = ctx.currentPlan;
  if (!plan || !['active', 'waiting'].includes(plan.status)) {
    return false;
  }

  // Multiple blockers with no resolution path
  if (ctx.unresolvedBlockers.length >= 3) {
    return true;
  }

  // Waiting on external input for > 72 hours
  const longWaiters = ctx.worldState.response_latency_signals.filter(
    s => s.days_waiting > 3,
  );
  if (longWaiters.length > 0 && ctx.unresolvedBlockers.length > 0) {
    return true;
  }

  // Critical deadline within 24 hours with unresolved blockers
  const criticalDeadlines = ctx.deadlines.filter(d => d.days_remaining <= 1);
  if (criticalDeadlines.length > 0 && ctx.unresolvedBlockers.length > 0) {
    return true;
  }

  return false;
}

function shouldCompletePlan(ctx: PlanRefreshContext): boolean {
  const plan = ctx.currentPlan;
  if (!plan || ['completed', 'cancelled', 'superseded'].includes(plan.status)) {
    return false;
  }

  // Entity moved to a terminal stage
  if (TERMINAL_STAGES.has(ctx.worldState.stage)) {
    return true;
  }

  // High completeness with no outstanding work
  if (
    ctx.worldState.completeness_score >= 95 &&
    ctx.worldState.missing_docs.length === 0 &&
    ctx.worldState.pending_approvals === 0 &&
    ctx.worldState.unresolved_exceptions === 0 &&
    ctx.worldState.overdue_obligations === 0 &&
    ctx.worldState.compliance_flags.length === 0 &&
    ctx.worldState.missing_signatures.length === 0
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Reason builders
// ---------------------------------------------------------------------------

function buildCompletionReason(ctx: PlanRefreshContext): string {
  if (TERMINAL_STAGES.has(ctx.worldState.stage)) {
    return `Entity reached terminal stage: ${ctx.worldState.stage}.`;
  }
  return 'All plan objectives met — completeness is high with no outstanding items.';
}

function buildBlockReason(ctx: PlanRefreshContext): string {
  const parts: string[] = [];

  if (ctx.unresolvedBlockers.length >= 3) {
    parts.push(`${ctx.unresolvedBlockers.length} unresolved blockers`);
  }

  const longWaiters = ctx.worldState.response_latency_signals.filter(
    s => s.days_waiting > 3,
  );
  if (longWaiters.length > 0) {
    parts.push(
      `waiting on external input > 72h: ${longWaiters.map(w => w.waiting_on).join(', ')}`,
    );
  }

  const criticalDeadlines = ctx.deadlines.filter(d => d.days_remaining <= 1);
  if (criticalDeadlines.length > 0) {
    parts.push(
      `critical deadline(s) within 24h with blockers: ${criticalDeadlines.map(d => d.description).join(', ')}`,
    );
  }

  return `Plan blocked: ${parts.join('; ')}.`;
}

function buildReplanReason(ctx: PlanRefreshContext): string {
  const plan = ctx.currentPlan!;
  const parts: string[] = [];

  const planAgeHours =
    (Date.now() - new Date(plan.updated_at).getTime()) / (1000 * 60 * 60);
  if (planAgeHours > plan.review_cadence_hours) {
    parts.push(`plan is stale (${Math.round(planAgeHours)}h old, cadence is ${plan.review_cadence_hours}h)`);
  }

  if (ctx.waitingStates.length > 0) {
    parts.push(`${ctx.waitingStates.length} subgoal(s) in waiting state`);
  }

  if (ctx.worldState.recent_uploads > 0) {
    parts.push(`${ctx.worldState.recent_uploads} recent upload(s) changed world state`);
  }

  if (ctx.worldState.recent_corrections > 0) {
    parts.push(`${ctx.worldState.recent_corrections} recent human correction(s)`);
  }

  if (ctx.recentFailures.length >= 2) {
    parts.push(`${ctx.recentFailures.length} recent failures`);
  }

  return `Replan needed: ${parts.join('; ')}.`;
}

// ---------------------------------------------------------------------------
// Subgoal generation
// ---------------------------------------------------------------------------

/**
 * Inspect the world state and produce a list of subgoals that should be
 * tracked by the plan. Called when creating or replanning.
 */
export function generateSubgoals(
  ctx: PlanRefreshContext,
): Omit<OrchestratorSubgoal, 'id' | 'plan_id' | 'created_at' | 'updated_at'>[] {
  const subgoals: Omit<OrchestratorSubgoal, 'id' | 'plan_id' | 'created_at' | 'updated_at'>[] = [];
  let sortOrder = 0;

  // Missing docs -> one subgoal per document type
  for (const docType of ctx.worldState.missing_docs) {
    sortOrder++;
    subgoals.push({
      title: `Obtain ${docType}`,
      intent: `Obtain the missing document "${docType}" for the ${ctx.entityType}.`,
      status: 'pending',
      urgency: 'high',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: `Document "${docType}" is uploaded and verified.`,
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['create_document_request'],
      completed_at: null,
    });
  }

  // Missing signatures
  for (const sig of ctx.worldState.missing_signatures) {
    sortOrder++;
    subgoals.push({
      title: `Obtain signature: ${sig}`,
      intent: `Collect the missing signature "${sig}".`,
      status: 'pending',
      urgency: 'high',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: `Signature "${sig}" is collected.`,
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['create_notification'],
      completed_at: null,
    });
  }

  // Low completeness
  if (ctx.worldState.completeness_score < 70) {
    sortOrder++;
    subgoals.push({
      title: 'Improve completeness',
      intent: `Raise the completeness score from ${ctx.worldState.completeness_score}% to at least 70%.`,
      status: 'pending',
      urgency: ctx.worldState.completeness_score < 40 ? 'critical' : 'high',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: 'Completeness score reaches 70% or higher.',
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['recompute_completeness'],
      completed_at: null,
    });
  }

  // Pending approvals
  if (ctx.worldState.pending_approvals > 0) {
    sortOrder++;
    subgoals.push({
      title: `Resolve ${ctx.worldState.pending_approvals} pending approval(s)`,
      intent: 'Get all pending approvals reviewed and decided.',
      status: 'pending',
      urgency: 'high',
      owner_user_id: null,
      owner_role: null,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: 'All pending approvals are resolved.',
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['create_notification'],
      completed_at: null,
    });
  }

  // Overdue obligations
  if (ctx.worldState.overdue_obligations > 0) {
    sortOrder++;
    subgoals.push({
      title: `Address ${ctx.worldState.overdue_obligations} overdue obligation(s)`,
      intent: 'Resolve all overdue obligations before they escalate further.',
      status: 'pending',
      urgency: 'critical',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: 'No overdue obligations remain.',
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['create_reminder_draft'],
      completed_at: null,
    });
  }

  // Unresolved exceptions
  if (ctx.worldState.unresolved_exceptions > 0) {
    sortOrder++;
    subgoals.push({
      title: `Resolve ${ctx.worldState.unresolved_exceptions} unresolved exception(s)`,
      intent: 'Clear all open exceptions so the deal can progress.',
      status: 'pending',
      urgency: ctx.worldState.unresolved_exceptions >= 3 ? 'critical' : 'high',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: 'All exceptions are resolved or acknowledged.',
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['recompute_exceptions'],
      completed_at: null,
    });
  }

  // Compliance flags
  for (const flag of ctx.worldState.compliance_flags) {
    sortOrder++;
    subgoals.push({
      title: `Resolve compliance: ${flag}`,
      intent: `Address the compliance flag "${flag}" to avoid regulatory risk.`,
      status: 'pending',
      urgency: 'critical',
      owner_user_id: null,
      owner_role: null,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: `Compliance flag "${flag}" is cleared.`,
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['request_manual_review'],
      completed_at: null,
    });
  }

  // Approaching deadlines
  for (const deadline of ctx.deadlines) {
    if (deadline.days_remaining <= 7) {
      sortOrder++;
      subgoals.push({
        title: `Complete before ${deadline.due_at.slice(0, 10)}: ${deadline.description}`,
        intent: `Ensure "${deadline.description}" is handled before the ${deadline.due_at.slice(0, 10)} deadline (${deadline.days_remaining} day(s) remaining).`,
        status: 'pending',
        urgency: deadline.days_remaining <= 1 ? 'critical' : deadline.days_remaining <= 3 ? 'high' : 'normal',
        owner_user_id: ctx.worldState.ownership.owner_id,
        owner_role: ctx.worldState.ownership.owner_role,
        sort_order: sortOrder,
        prerequisites: [],
        completion_condition: `"${deadline.description}" is complete or the deadline is extended.`,
        blocked_reason: null,
        blocked_since: null,
        linked_action_ids: [],
        linked_tool_names: [],
        completed_at: null,
      });
    }
  }

  // Unresolved blockers from memory
  for (const blocker of ctx.unresolvedBlockers) {
    sortOrder++;
    subgoals.push({
      title: `Resolve blocker: ${blocker.slice(0, 80)}`,
      intent: `Clear the blocker: "${blocker}".`,
      status: 'blocked',
      urgency: 'high',
      owner_user_id: null,
      owner_role: null,
      sort_order: sortOrder,
      prerequisites: [],
      completion_condition: `Blocker "${blocker.slice(0, 60)}" is resolved.`,
      blocked_reason: blocker,
      blocked_since: new Date().toISOString(),
      linked_action_ids: [],
      linked_tool_names: [],
      completed_at: null,
    });
  }

  return subgoals;
}

// ---------------------------------------------------------------------------
// Progress computation
// ---------------------------------------------------------------------------

/**
 * Compute plan progress from an in-memory array of subgoals.
 * For DB-backed progress, use orchestrator-subgoals repo's computeProgress.
 */
export function computePlanProgress(subgoals: OrchestratorSubgoal[]): PlanProgress {
  const total = subgoals.length;
  const counts = {
    pending: 0,
    in_progress: 0,
    waiting: 0,
    blocked: 0,
    completed: 0,
    skipped: 0,
  };

  for (const sg of subgoals) {
    counts[sg.status] = (counts[sg.status] ?? 0) + 1;
  }

  const completionPercentage =
    total === 0
      ? 0
      : Math.round(((counts.completed + counts.skipped) / total) * 100);

  return {
    total_subgoals: total,
    ...counts,
    completion_percentage: completionPercentage,
  };
}
