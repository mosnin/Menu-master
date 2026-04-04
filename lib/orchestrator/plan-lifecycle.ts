import crypto from 'crypto';
import type {
  WorldStateSnapshot,
  OrchestratorPlan,
  OrchestratorSubgoal,
  PlanProgress,
  PlanStatus,
  WaitingOnType,
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
  /** Current subgoals for the active plan (for dependency and waiting checks) */
  currentSubgoals?: OrchestratorSubgoal[];
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

  // World state hash changed significantly since plan was created
  // This replaces the old "any upload → replan" which was too aggressive
  if (plan.world_state_hash) {
    const currentHash = computeWorldStateHash(ctx.worldState);
    if (currentHash !== plan.world_state_hash) {
      // Only replan if the change is significant (score delta, stage change, doc count change)
      if (hasSignificantStateChange(ctx, plan)) {
        return true;
      }
    }
  }

  // Waiting subgoals that have exceeded their escalation threshold
  if (ctx.currentSubgoals) {
    const escalatedWaiters = ctx.currentSubgoals.filter(sg => {
      if (sg.status !== 'waiting' || !sg.waiting_since) return false;
      const waitingHours = (Date.now() - new Date(sg.waiting_since).getTime()) / (1000 * 60 * 60);
      return waitingHours > (sg.waiting_escalation_hours ?? 48);
    });
    if (escalatedWaiters.length > 0) {
      return true;
    }
  }

  // Multiple recent failures suggest the current plan's actions are not working
  if (ctx.recentFailures.length >= 3) {
    return true;
  }

  // A critical deadline emerged that wasn't in the plan
  const criticalDeadlines = ctx.deadlines.filter(d => d.days_remaining <= 2);
  if (criticalDeadlines.length > 0 && plan.risk_summary === null) {
    return true;
  }

  return false;
}

/**
 * Determine if world state changes since plan creation are significant enough
 * to warrant replanning. Prevents noisy replans from trivial changes.
 */
function hasSignificantStateChange(
  ctx: PlanRefreshContext,
  plan: OrchestratorPlan,
): boolean {
  const ws = ctx.worldState;

  // Stage changed — always significant
  if (plan.objective && !plan.objective.includes(ws.stage)) {
    return true;
  }

  // Completeness changed by >= 15 points (meaningful progress or regression)
  if (ctx.currentSubgoals) {
    const completenessSubgoal = ctx.currentSubgoals.find(sg => sg.title === 'Improve completeness');
    if (completenessSubgoal && completenessSubgoal.status !== 'completed' && ws.completeness_score >= 70) {
      return true; // Significant progress made
    }
  }

  // Missing docs changed (new docs uploaded or new docs required)
  if (ws.recent_uploads >= 2) {
    return true; // Multiple new uploads is significant
  }

  // Human corrections are always significant
  if (ws.recent_corrections > 0) {
    return true;
  }

  // New blocker appeared that wasn't there before
  if (ctx.unresolvedBlockers.length > 0 && plan.blocked_reason === null) {
    const planAge = (Date.now() - new Date(plan.created_at).getTime()) / (1000 * 60 * 60);
    if (planAge > 1) {
      return true; // Only if plan has been running for at least 1 hour
    }
  }

  return false;
}

/**
 * Compute a hash of the world state fields that matter for plan relevance.
 * Used to detect meaningful state changes between cycles.
 */
export function computeWorldStateHash(ws: WorldStateSnapshot): string {
  const significantFields = {
    stage: ws.stage,
    missing_docs: ws.missing_docs.sort(),
    completeness_score: Math.round(ws.completeness_score / 10) * 10, // Round to nearest 10
    unresolved_exceptions: ws.unresolved_exceptions,
    pending_approvals: ws.pending_approvals,
    overdue_obligations: ws.overdue_obligations,
    compliance_flags: ws.compliance_flags.sort(),
    missing_signatures: ws.missing_signatures.sort(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(significantFields)).digest('hex').slice(0, 16);
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

  // Escalated waiting subgoals
  if (ctx.currentSubgoals) {
    const escalated = ctx.currentSubgoals.filter(sg => {
      if (sg.status !== 'waiting' || !sg.waiting_since) return false;
      const waitingHours = (Date.now() - new Date(sg.waiting_since).getTime()) / (1000 * 60 * 60);
      return waitingHours > (sg.waiting_escalation_hours ?? 48);
    });
    if (escalated.length > 0) {
      parts.push(`${escalated.length} subgoal(s) exceeded waiting escalation threshold`);
    }
  }

  // State change detection
  if (plan.objective && !plan.objective.includes(ctx.worldState.stage)) {
    parts.push(`stage changed to "${ctx.worldState.stage}"`);
  }

  if (ctx.worldState.recent_uploads >= 2) {
    parts.push(`${ctx.worldState.recent_uploads} recent uploads changed world state`);
  }

  if (ctx.worldState.recent_corrections > 0) {
    parts.push(`${ctx.worldState.recent_corrections} human correction(s)`);
  }

  if (ctx.recentFailures.length >= 3) {
    parts.push(`${ctx.recentFailures.length} recent failures`);
  }

  const criticalDeadlines = ctx.deadlines.filter(d => d.days_remaining <= 2);
  if (criticalDeadlines.length > 0) {
    parts.push(`${criticalDeadlines.length} critical deadline(s) within 2 days`);
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
    const waitingOnType = inferWaitingOnType(docType);
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
      waiting_on_type: waitingOnType,
      waiting_on_detail: `Waiting for ${docType} to be uploaded`,
      waiting_since: null,
      waiting_expected_event: `${docType} document uploaded`,
      waiting_escalation_hours: 48,
      depends_on_subgoal_ids: [],
    });
  }

  // Missing signatures — depend on having the related document first
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
      waiting_on_type: 'counterparty',
      waiting_on_detail: `Waiting for ${sig} signature`,
      waiting_since: null,
      waiting_expected_event: `${sig} signed`,
      waiting_escalation_hours: 72,
      depends_on_subgoal_ids: [],
    });
  }

  // Low completeness — depends on document subgoals being advanced
  if (ctx.worldState.completeness_score < 70) {
    sortOrder++;
    const docSubgoalIndices = subgoals
      .filter(sg => sg.title.startsWith('Obtain '))
      .map((_, idx) => idx);
    subgoals.push({
      title: 'Improve completeness',
      intent: `Raise the completeness score from ${ctx.worldState.completeness_score}% to at least 70%.`,
      status: 'pending',
      urgency: ctx.worldState.completeness_score < 40 ? 'critical' : 'high',
      owner_user_id: ctx.worldState.ownership.owner_id,
      owner_role: ctx.worldState.ownership.owner_role,
      sort_order: sortOrder,
      prerequisites: docSubgoalIndices.length > 0
        ? ['Document subgoals should be initiated first']
        : [],
      completion_condition: 'Completeness score reaches 70% or higher.',
      blocked_reason: null,
      blocked_since: null,
      linked_action_ids: [],
      linked_tool_names: ['recompute_completeness'],
      completed_at: null,
      waiting_on_type: null,
      waiting_on_detail: null,
      waiting_since: null,
      waiting_expected_event: null,
      waiting_escalation_hours: null,
      depends_on_subgoal_ids: [],
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
      waiting_on_type: 'approval',
      waiting_on_detail: `${ctx.worldState.pending_approvals} approval(s) pending review`,
      waiting_since: null,
      waiting_expected_event: 'Approvals decided',
      waiting_escalation_hours: 24,
      depends_on_subgoal_ids: [],
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
      waiting_on_type: null,
      waiting_on_detail: null,
      waiting_since: null,
      waiting_expected_event: null,
      waiting_escalation_hours: null,
      depends_on_subgoal_ids: [],
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
      waiting_on_type: null,
      waiting_on_detail: null,
      waiting_since: null,
      waiting_expected_event: null,
      waiting_escalation_hours: null,
      depends_on_subgoal_ids: [],
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
      waiting_on_type: 'compliance_review',
      waiting_on_detail: `Compliance flag "${flag}" needs review`,
      waiting_since: null,
      waiting_expected_event: `Compliance flag "${flag}" cleared`,
      waiting_escalation_hours: 24,
      depends_on_subgoal_ids: [],
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
        waiting_on_type: null,
        waiting_on_detail: null,
        waiting_since: null,
        waiting_expected_event: null,
        waiting_escalation_hours: null,
        depends_on_subgoal_ids: [],
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
      waiting_on_type: null,
      waiting_on_detail: null,
      waiting_since: null,
      waiting_expected_event: null,
      waiting_escalation_hours: null,
      depends_on_subgoal_ids: [],
    });
  }

  return subgoals;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Infer what external party a document is typically waiting on based on type.
 */
function inferWaitingOnType(docType: string): WaitingOnType {
  const lowerDoc = docType.toLowerCase();
  // Check more specific patterns first to avoid false matches
  if (lowerDoc.includes('title') || lowerDoc.includes('deed')) return 'title';
  if (lowerDoc.includes('lender') || lowerDoc.includes('pre_approval') || lowerDoc.includes('commitment')) return 'lender';
  if (lowerDoc.includes('appraisal')) return 'appraiser';
  if (lowerDoc.includes('inspection')) return 'inspector';
  if (lowerDoc.includes('seller') || lowerDoc.includes('disclosure')) return 'seller';
  if (lowerDoc.includes('buyer') || lowerDoc.includes('earnest')) return 'buyer';
  return 'document_upload';
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
