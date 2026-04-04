import type {
  OrchestratorCycle,
  OrchestratorCycleStatus,
  OrchestratorCycleTrigger,
  OrchestratorActionProposal,
  OrchestratorPlan,
  OrchestratorSubgoal,
} from '@/types';
import * as orchestratorRepo from '@/lib/repositories/deal-orchestrators';
import * as worldStateService from '@/lib/services/orchestrator-world-state-service';
import * as worldStateRepo from '@/lib/repositories/orchestrator-world-states';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';
import * as cycleRepo from '@/lib/repositories/orchestrator-cycles';
import * as actionRepo from '@/lib/repositories/orchestrator-actions';
import * as nextActionRepo from '@/lib/repositories/orchestrator-next-actions';
import * as planRepo from '@/lib/repositories/orchestrator-plans';
import * as subgoalRepo from '@/lib/repositories/orchestrator-subgoals';
import * as planRevisionRepo from '@/lib/repositories/orchestrator-plan-revisions';
import { logAction } from '@/lib/audit/logger';
import { registerAllTools } from './tools';
import { runPlanner } from './planner';
import { runCritic } from './critic';
import { executeApprovedActions } from './executor';
import { processFollowThroughSequences } from './follow-through';
import {
  evaluatePlanAction,
  generateSubgoals,
  computePlanProgress,
  type PlanRefreshContext,
  type PlanAction,
} from './plan-lifecycle';
import type { ToolExecutionContext } from './tool-registry';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------

const PIPELINE_CONFIG = {
  /** Hours after which a next-action card is considered stale */
  STALE_ACTION_HOURS: 48,
  /** Maximum number of recent memory entries to feed to the planner */
  MAX_MEMORY_ENTRIES: 30,
  /** Minimum minutes between observations for scheduled triggers */
  MIN_OBSERVATION_INTERVAL_MINUTES: 20,
} as const;

export async function runOrchestrationCycle(
  orchestratorId: string,
  triggerType: OrchestratorCycleTrigger,
  triggerMetadata?: Record<string, unknown>,
): Promise<OrchestratorCycle> {
  const startTime = Date.now();

  // Ensure all tools are registered
  registerAllTools();

  // 1. Load orchestrator
  const orchestrator = await orchestratorRepo.findById(orchestratorId);
  if (!orchestrator) {
    throw new Error(`Orchestrator not found: ${orchestratorId}`);
  }

  if (orchestrator.status !== 'active') {
    throw new Error(`Orchestrator is not active: ${orchestrator.status}`);
  }

  // Create cycle record
  const cycle = await cycleRepo.create({
    orchestrator_id: orchestratorId,
    cycle_number: orchestrator.cycle_count + 1,
    trigger_type: triggerType,
    trigger_metadata: triggerMetadata ?? {},
    world_state_id: null,
    planner_output: null,
    critic_evaluation: null,
    selected_actions: [],
    execution_summary: null,
    duration_ms: null,
    status: 'running',
    skip_reason: null,
    completed_at: null,
  });

  // Audit: cycle started
  await logAction({
    organizationId: orchestrator.organization_id,
    transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
    actorType: 'ai',
    action: 'orchestrator.cycle_started',
    targetType: 'orchestrator_cycle',
    targetId: cycle.id,
    metadata: {
      orchestrator_id: orchestratorId,
      cycle_number: cycle.cycle_number,
      trigger_type: triggerType,
    },
  });

  try {
    // 2. Capture world state
    const worldSnapshot = await worldStateService.aggregateWorldState(
      orchestratorId,
      orchestrator.entity_type,
      orchestrator.entity_id,
    );

    if (!worldSnapshot) {
      console.error(
        `[orchestrator] Failed to capture world state for orchestrator ${orchestratorId}`,
      );
      const failedCycle = await cycleRepo.update(cycle.id, {
        status: 'failed',
        skip_reason: 'World state capture returned null',
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
        execution_summary: { error: 'World state capture returned null' },
      });
      return failedCycle;
    }

    const stateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(worldSnapshot))
      .digest('hex');

    // 3. Check if state changed (skip if no change for scheduled triggers)
    const previousState = await worldStateRepo.findLatestByOrchestrator(orchestratorId);
    const stateChanged = !previousState || previousState.state_hash !== stateHash;

    if (!stateChanged && triggerType === 'scheduled') {
      const skippedCycle = await cycleRepo.update(cycle.id, {
        status: 'skipped',
        skip_reason: 'No state change detected since last observation',
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      });

      return skippedCycle;
    }

    // Store world state
    const worldStateRecord = await worldStateRepo.create({
      orchestrator_id: orchestratorId,
      snapshot: worldSnapshot,
      state_hash: stateHash,
      changed_since_last: stateChanged,
    });

    // Update cycle with world state
    await cycleRepo.update(cycle.id, {
      world_state_id: worldStateRecord.id,
    });

    // 4. Load memory
    const memory = await memoryRepo.findRecent(orchestratorId, PIPELINE_CONFIG.MAX_MEMORY_ENTRIES);

    // 4a. Evaluate plan lifecycle
    const currentPlan = await planRepo.findActivePlan(orchestratorId);
    const currentSubgoals: OrchestratorSubgoal[] = currentPlan
      ? await subgoalRepo.findByPlan(currentPlan.id)
      : [];

    const unresolvedBlockers = memory
      .filter(m => m.memory_type === 'blocker' && !m.resolved)
      .map(m => m.summary);
    const recentFailures = memory
      .filter(m => m.memory_type === 'failure_pattern')
      .map(m => m.summary);
    const waitingSubgoals = currentSubgoals
      .filter(sg => sg.status === 'waiting' || sg.status === 'blocked')
      .map(sg => sg.title);

    const planRefreshCtx: PlanRefreshContext = {
      orchestratorId,
      organizationId: orchestrator.organization_id,
      entityType: orchestrator.entity_type,
      entityId: orchestrator.entity_id,
      currentPlan,
      worldState: worldSnapshot,
      unresolvedBlockers,
      recentFailures,
      deadlines: worldSnapshot.urgent_deadlines,
      waitingStates: waitingSubgoals,
    };

    const planDecision = evaluatePlanAction(planRefreshCtx);

    let activePlan: OrchestratorPlan | null = currentPlan;
    let activeSubgoals: OrchestratorSubgoal[] = currentSubgoals;

    // Act on plan decision
    switch (planDecision.action as PlanAction) {
      case 'wait': {
        // Skip this cycle — no actionable work
        const skippedCycle = await cycleRepo.update(cycle.id, {
          status: 'skipped',
          skip_reason: planDecision.reason,
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        });
        return skippedCycle;
      }

      case 'create_plan': {
        const newSubgoalDefs = generateSubgoals(planRefreshCtx);
        const plan = await planRepo.create({
          orchestrator_id: orchestratorId,
          organization_id: orchestrator.organization_id,
          title: `Plan for ${orchestrator.entity_type} ${orchestrator.entity_id.slice(0, 8)}`,
          objective: `Advance ${orchestrator.entity_type} through ${worldSnapshot.stage} stage to completion.`,
          entity_type: orchestrator.entity_type,
          entity_id: orchestrator.entity_id,
          status: 'active',
          priority: orchestrator.priority,
          priority_rationale: null,
          review_cadence_hours: 24,
          refresh_conditions: ['stage_change', 'document_upload', 'blocker_resolved'],
          version: 1,
          superseded_by: null,
          blocked_reason: null,
          blocked_since: null,
          completed_at: null,
          expires_at: null,
        });

        const createdSubgoals: OrchestratorSubgoal[] = [];
        for (const sgDef of newSubgoalDefs) {
          const sg = await subgoalRepo.create({ ...sgDef, plan_id: plan.id });
          createdSubgoals.push(sg);
        }

        activePlan = plan;
        activeSubgoals = createdSubgoals;

        await logAction({
          organizationId: orchestrator.organization_id,
          transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
          actorType: 'ai',
          action: 'orchestrator.plan_created',
          targetType: 'orchestrator_plan',
          targetId: plan.id,
          metadata: {
            orchestrator_id: orchestratorId,
            cycle_id: cycle.id,
            reason: planDecision.reason,
            subgoal_count: createdSubgoals.length,
          },
        });
        break;
      }

      case 'replan': {
        // Create revision record for the old plan
        if (currentPlan) {
          await planRevisionRepo.create({
            plan_id: currentPlan.id,
            revision_number: currentPlan.version,
            reason: planDecision.reason,
            changes_summary: `Superseded due to replan: ${planDecision.reason}`,
            previous_snapshot: {
              plan: currentPlan,
              subgoals: currentSubgoals,
              progress: computePlanProgress(currentSubgoals),
            },
          });
        }

        // Create new plan
        const newSubgoalDefs = generateSubgoals(planRefreshCtx);
        const newVersion = currentPlan ? currentPlan.version + 1 : 1;
        const newPlan = await planRepo.create({
          orchestrator_id: orchestratorId,
          organization_id: orchestrator.organization_id,
          title: `Plan v${newVersion} for ${orchestrator.entity_type} ${orchestrator.entity_id.slice(0, 8)}`,
          objective: `Advance ${orchestrator.entity_type} through ${worldSnapshot.stage} stage to completion.`,
          entity_type: orchestrator.entity_type,
          entity_id: orchestrator.entity_id,
          status: 'active',
          priority: orchestrator.priority,
          priority_rationale: null,
          review_cadence_hours: 24,
          refresh_conditions: ['stage_change', 'document_upload', 'blocker_resolved'],
          version: newVersion,
          superseded_by: null,
          blocked_reason: null,
          blocked_since: null,
          completed_at: null,
          expires_at: null,
        });

        // Supersede old plan
        if (currentPlan) {
          await planRepo.supersede(currentPlan.id, newPlan.id);
        }

        const createdSubgoals: OrchestratorSubgoal[] = [];
        for (const sgDef of newSubgoalDefs) {
          const sg = await subgoalRepo.create({ ...sgDef, plan_id: newPlan.id });
          createdSubgoals.push(sg);
        }

        activePlan = newPlan;
        activeSubgoals = createdSubgoals;

        await logAction({
          organizationId: orchestrator.organization_id,
          transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
          actorType: 'ai',
          action: 'orchestrator.plan_replanned',
          targetType: 'orchestrator_plan',
          targetId: newPlan.id,
          metadata: {
            orchestrator_id: orchestratorId,
            cycle_id: cycle.id,
            reason: planDecision.reason,
            previous_plan_id: currentPlan?.id ?? null,
            version: newVersion,
            subgoal_count: createdSubgoals.length,
          },
        });
        break;
      }

      case 'block_plan': {
        if (currentPlan) {
          await planRepo.block(currentPlan.id, planDecision.reason);
          activePlan = { ...currentPlan, status: 'blocked', blocked_reason: planDecision.reason };

          await logAction({
            organizationId: orchestrator.organization_id,
            transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
            actorType: 'ai',
            action: 'orchestrator.plan_blocked',
            targetType: 'orchestrator_plan',
            targetId: currentPlan.id,
            metadata: {
              orchestrator_id: orchestratorId,
              cycle_id: cycle.id,
              reason: planDecision.reason,
            },
          });
        }
        break;
      }

      case 'complete_plan': {
        if (currentPlan) {
          await planRepo.complete(currentPlan.id);
          activePlan = { ...currentPlan, status: 'completed' };

          // Mark remaining pending subgoals as skipped
          for (const sg of currentSubgoals) {
            if (sg.status === 'pending' || sg.status === 'in_progress' || sg.status === 'waiting') {
              await subgoalRepo.skip(sg.id);
            }
          }

          await logAction({
            organizationId: orchestrator.organization_id,
            transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
            actorType: 'ai',
            action: 'orchestrator.plan_completed',
            targetType: 'orchestrator_plan',
            targetId: currentPlan.id,
            metadata: {
              orchestrator_id: orchestratorId,
              cycle_id: cycle.id,
              reason: planDecision.reason,
              progress: computePlanProgress(currentSubgoals),
            },
          });
        }
        break;
      }

      case 'continue':
      default:
        // Keep existing plan context
        break;
    }

    // 5. Run planner (with plan context)
    const plannerOutput = await runPlanner(worldSnapshot, memory, {
      entityType: orchestrator.entity_type,
      entityId: orchestrator.entity_id,
      orgId: orchestrator.organization_id,
    });

    await cycleRepo.update(cycle.id, {
      planner_output: plannerOutput,
    });

    // 6. Run critic
    const criticEvaluation = await runCritic(plannerOutput, worldSnapshot);

    await cycleRepo.update(cycle.id, {
      critic_evaluation: criticEvaluation,
    });

    // 7. Filter to approved actions and create proposals
    const approvedProposals: OrchestratorActionProposal[] = [];

    for (let i = 0; i < plannerOutput.proposed_actions.length; i++) {
      const action = plannerOutput.proposed_actions[i];
      const review = criticEvaluation.action_reviews.find(r => r.tool_name === action.tool_name);
      const criticApproved = review?.approved ?? null;

      const proposal = await actionRepo.createProposal({
        cycle_id: cycle.id,
        orchestrator_id: orchestratorId,
        tool_name: action.tool_name,
        tool_params: action.params,
        risk_class: action.risk_class,
        confidence: action.confidence,
        reason: action.reason,
        critic_approved: criticApproved,
        critic_notes: review?.concerns.join('; ') ?? null,
        prerequisites: action.prerequisites,
        status: criticApproved === false ? 'rejected' : 'proposed',
        gated_reason: criticApproved === false ? (review?.concerns.join('; ') ?? 'Rejected by critic') : null,
      });

      await logAction({
        organizationId: orchestrator.organization_id,
        transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
        actorType: 'ai',
        action: 'orchestrator.action_proposed',
        targetType: 'orchestrator_action',
        targetId: proposal.id,
        metadata: {
          tool_name: action.tool_name,
          risk_class: action.risk_class,
          confidence: action.confidence,
          critic_approved: criticApproved,
        },
      });

      if (criticApproved !== false) {
        approvedProposals.push(proposal);
      }
    }

    const selectedActionIds = approvedProposals.map(p => p.id);

    await cycleRepo.update(cycle.id, {
      selected_actions: selectedActionIds,
    });

    // 8. Execute approved actions
    const executionContext: ToolExecutionContext = {
      orchestratorId,
      organizationId: orchestrator.organization_id,
      entityType: orchestrator.entity_type,
      entityId: orchestrator.entity_id,
      actorUserId: undefined,
    };

    const executions = await executeApprovedActions(approvedProposals, executionContext);

    // Count gated actions by checking proposal status rather than string-matching error messages
    const allProposals = await actionRepo.findProposalsByCycle(cycle.id);
    const gatedCount = allProposals.filter(p => p.status === 'gated').length;

    const totalExecuted = executions.filter(e => e.success).length;
    const totalFailed = executions.filter(e => !e.success && !allProposals.find(p => p.id === e.proposal_id && (p.status === 'gated' || p.status === 'rejected'))).length;

    const executionSummary = {
      total_proposed: plannerOutput.proposed_actions.length,
      total_approved: approvedProposals.length,
      total_executed: totalExecuted,
      total_failed: totalFailed,
      total_gated: gatedCount,
    };

    // 8a. Update subgoal statuses based on executed actions
    if (activePlan && activePlan.status === 'active' && activeSubgoals.length > 0) {
      const executedToolNames = new Set(
        executions.filter(e => e.success).map(e => {
          const proposal = approvedProposals.find(p => p.id === e.proposal_id);
          return proposal?.tool_name;
        }).filter(Boolean) as string[],
      );

      for (const sg of activeSubgoals) {
        if (sg.status === 'pending' || sg.status === 'waiting') {
          // If any of the subgoal's linked tools were executed, mark in_progress
          const hasLinkedExecution = sg.linked_tool_names.some(tn => executedToolNames.has(tn));
          if (hasLinkedExecution) {
            await subgoalRepo.update(sg.id, { status: 'in_progress' });
          }
        }
      }

      // Check if document-related subgoals can be completed
      for (const sg of activeSubgoals) {
        if (
          sg.status !== 'completed' &&
          sg.status !== 'skipped' &&
          sg.title.startsWith('Obtain ') &&
          !worldSnapshot.missing_docs.some(doc => sg.title.includes(doc))
        ) {
          await subgoalRepo.complete(sg.id);
        }
      }

      // Check if completeness subgoal can be completed
      for (const sg of activeSubgoals) {
        if (
          sg.title === 'Improve completeness' &&
          sg.status !== 'completed' &&
          sg.status !== 'skipped' &&
          worldSnapshot.completeness_score >= 70
        ) {
          await subgoalRepo.complete(sg.id);
        }
      }

      // Check if approval subgoals can be completed
      for (const sg of activeSubgoals) {
        if (
          sg.title.includes('pending approval') &&
          sg.status !== 'completed' &&
          sg.status !== 'skipped' &&
          worldSnapshot.pending_approvals === 0
        ) {
          await subgoalRepo.complete(sg.id);
        }
      }
    }

    // 9. Update next action cards
    await nextActionRepo.staleAll(orchestratorId);

    if (plannerOutput.primary_recommendation) {
      await nextActionRepo.create({
        orchestrator_id: orchestratorId,
        title: plannerOutput.primary_recommendation,
        reason: plannerOutput.reasoning_summary,
        urgency: plannerOutput.urgency_assessment,
        risk_class: 'safe',
        owner_user_id: null,
        owner_role: null,
        prerequisites: plannerOutput.blockers_identified,
        source_signals: plannerOutput.proposed_actions.map(a => ({
          type: a.tool_name,
          detail: a.reason,
        })),
        auto_executable: false,
        tool_name: plannerOutput.proposed_actions[0]?.tool_name ?? null,
        tool_params: plannerOutput.proposed_actions[0]?.params ?? null,
        is_primary: true,
        status: 'active',
        stale_after: new Date(Date.now() + PIPELINE_CONFIG.STALE_ACTION_HOURS * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        cycle_id: cycle.id,
      });
    }

    // 10. Store cycle record
    const durationMs = Date.now() - startTime;

    // Use 'completed_with_errors' if some actions failed but the cycle itself succeeded
    const cycleStatus: OrchestratorCycleStatus =
      totalFailed > 0 ? 'completed_with_errors' : 'completed';

    const completedCycle = await cycleRepo.update(cycle.id, {
      execution_summary: executionSummary,
      duration_ms: durationMs,
      status: cycleStatus,
      completed_at: new Date().toISOString(),
    });

    // 11. Update orchestrator timestamps
    await orchestratorRepo.update(orchestratorId, {
      last_observed_at: new Date().toISOString(),
      last_planned_at: new Date().toISOString(),
      last_executed_at:
        executionSummary.total_executed > 0
          ? new Date().toISOString()
          : orchestrator.last_executed_at,
      cycle_count: orchestrator.cycle_count + 1,
    });

    // 12. Process follow-through sequences
    const followThroughTriggerData: Record<string, unknown> = {};
    if (triggerType === 'document_uploaded' && triggerMetadata?.document_type) {
      followThroughTriggerData.document_uploaded = {
        document_type: triggerMetadata.document_type,
      };
    }

    try {
      await processFollowThroughSequences(
        orchestratorId,
        worldSnapshot,
        executionContext,
        followThroughTriggerData,
      );
    } catch (ftError) {
      console.error(
        `[orchestrator] Follow-through processing failed for ${orchestratorId}:`,
        ftError,
      );
      // Non-fatal: don't fail the cycle for follow-through errors
    }

    // Handle escalation if needed
    if (criticEvaluation.escalation_needed) {
      await orchestratorRepo.update(orchestratorId, {
        last_human_escalation_at: new Date().toISOString(),
        last_human_escalation_status: 'pending',
      });

      await logAction({
        organizationId: orchestrator.organization_id,
        transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
        actorType: 'ai',
        action: 'orchestrator.escalation_created',
        targetType: 'deal_orchestrator',
        targetId: orchestratorId,
        metadata: {
          escalation_reason: criticEvaluation.escalation_reason,
          cycle_id: cycle.id,
        },
      });
    }

    // 13. Audit log: cycle completed
    await logAction({
      organizationId: orchestrator.organization_id,
      transactionId: orchestrator.entity_type === 'transaction' ? orchestrator.entity_id : undefined,
      actorType: 'ai',
      action: 'orchestrator.cycle_completed',
      targetType: 'orchestrator_cycle',
      targetId: cycle.id,
      metadata: {
        orchestrator_id: orchestratorId,
        cycle_number: completedCycle.cycle_number,
        duration_ms: durationMs,
        ...executionSummary,
      },
    });

    return completedCycle;
  } catch (error) {
    // Mark cycle as failed
    const failedCycle = await cycleRepo.update(cycle.id, {
      status: 'failed',
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
      execution_summary: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return failedCycle;
  }
}
