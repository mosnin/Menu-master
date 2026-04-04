import type {
  FollowThroughSequence,
  FollowThroughStep,
  FollowThroughRun,
  SequenceStatus,
  WorldStateSnapshot,
} from '@/types';
import { getTool } from './tool-registry';
import type { ToolExecutionContext } from './tool-registry';
import * as followThroughRepo from '@/lib/repositories/orchestrator-follow-through';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';

// ---------------------------------------------------------------------------
// Built-in Sequences
// ---------------------------------------------------------------------------

const MISSING_DOCUMENT_FOLLOW_THROUGH: FollowThroughSequence = {
  id: 'missing-document-follow-through',
  name: 'Missing Document Follow-Through',
  description:
    'Detects missing documents and follows through with notifications, checklist items, and reminder drafts until the document is uploaded or manually dismissed.',
  trigger: 'missing_document_detected',
  steps: [
    {
      step_number: 1,
      tool_name: 'create_next_action_card',
      params_template: {
        title: 'Missing document: {{document_type}}',
        reason: 'Document "{{document_type}}" is missing from the deal package.',
        urgency: 'high',
        risk_class: 'safe',
      },
    },
    {
      step_number: 2,
      tool_name: 'create_checklist_item',
      params_template: {
        title: 'Upload {{document_type}}',
        description: 'Required document "{{document_type}}" needs to be uploaded.',
        due_days_from_now: 3,
      },
      condition: 'Checklist item for this document type does not already exist',
    },
    {
      step_number: 3,
      tool_name: 'create_notification',
      params_template: {
        message: 'Missing document: {{document_type}} needs to be uploaded for this deal.',
        notification_type: 'missing_document',
        target_user_id: '{{assigned_agent_id}}',
      },
    },
    {
      step_number: 4,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Reminder: {{document_type}} is still missing after 24 hours. Please upload promptly.',
        notification_type: 'missing_document_reminder',
        target_user_id: '{{assigned_agent_id}}',
      },
      wait_for: 'document_still_missing',
      max_wait_hours: 24,
      condition: 'Document is still missing after 24 hours',
    },
    {
      step_number: 5,
      tool_name: 'create_reminder_draft',
      params_template: {
        subject: 'Follow-up: Missing {{document_type}}',
        body: 'This is a follow-up regarding the missing {{document_type}}. Please upload at your earliest convenience.',
        recipient_user_id: '{{assigned_agent_id}}',
      },
      condition: 'Document is still missing after wait period',
    },
  ],
  exit_conditions: ['Document uploaded', 'Manually dismissed'],
  max_duration_hours: 72,
  allows_cancellation: true,
};

const STALE_APPROVAL_FOLLOW_THROUGH: FollowThroughSequence = {
  id: 'stale-approval-follow-through',
  name: 'Stale Approval Follow-Through',
  description:
    'Follows up on approvals that have been pending for over 48 hours with reminders and escalation.',
  trigger: 'approval_pending_over_48h',
  steps: [
    {
      step_number: 1,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Approval pending for over 48 hours: {{approval_description}}. Please review.',
        notification_type: 'stale_approval_reminder',
        target_user_id: '{{approver_user_id}}',
      },
    },
    {
      step_number: 2,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Second reminder: Approval "{{approval_description}}" has been pending for 72+ hours.',
        notification_type: 'stale_approval_escalation',
        target_user_id: '{{approver_user_id}}',
      },
      wait_for: 'approval_still_pending',
      max_wait_hours: 24,
      condition: 'Approval is still pending after 24 hours',
    },
    {
      step_number: 3,
      tool_name: 'create_next_action_card',
      params_template: {
        title: 'Escalation: Stale approval — {{approval_description}}',
        reason:
          'Approval has been pending for over 72 hours. Coordinator attention required.',
        urgency: 'critical',
        risk_class: 'safe',
      },
      condition: 'Approval is still pending after escalation reminder',
    },
    {
      step_number: 4,
      tool_name: 'request_manual_review',
      params_template: {
        reason:
          'Approval "{{approval_description}}" has been stale for over 72 hours. Manual intervention required.',
        context: {
          approval_description: '{{approval_description}}',
          approver_user_id: '{{approver_user_id}}',
          pending_since: '{{pending_since}}',
        },
      },
    },
  ],
  exit_conditions: ['Approval decided', 'Manually dismissed'],
  max_duration_hours: 96,
  allows_cancellation: true,
};

const COMPLETENESS_RECOVERY: FollowThroughSequence = {
  id: 'completeness-recovery',
  name: 'Completeness Recovery',
  description:
    'Triggered when deal completeness score drops below 50%. Recomputes state and alerts the deal owner.',
  trigger: 'completeness_below_50',
  steps: [
    {
      step_number: 1,
      tool_name: 'recompute_completeness',
      params_template: {},
    },
    {
      step_number: 2,
      tool_name: 'recompute_exceptions',
      params_template: {},
    },
    {
      step_number: 3,
      tool_name: 'create_next_action_card',
      params_template: {
        title: 'Completeness recovery needed — score dropped below 50%',
        reason:
          'Deal completeness score has fallen below 50%. Review missing items and take corrective action.',
        urgency: 'critical',
        risk_class: 'safe',
      },
    },
    {
      step_number: 4,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Deal completeness score has dropped below 50%. Immediate attention required to recover deal health.',
        notification_type: 'completeness_alert',
        target_user_id: '{{deal_owner_id}}',
      },
    },
  ],
  exit_conditions: ['Completeness recovers above 60%', 'Manually dismissed'],
  max_duration_hours: 48,
  allows_cancellation: true,
};

const POST_DOCUMENT_UPLOAD_PROCESSING: FollowThroughSequence = {
  id: 'post-document-upload-processing',
  name: 'Post-Document Upload Processing',
  description:
    'Runs immediately after a document is uploaded to recompute completeness, exceptions, and health score, then clears stale related actions.',
  trigger: 'document_uploaded',
  steps: [
    {
      step_number: 1,
      tool_name: 'recompute_completeness',
      params_template: {},
    },
    {
      step_number: 2,
      tool_name: 'recompute_exceptions',
      params_template: {},
    },
    {
      step_number: 3,
      tool_name: 'recompute_health_score',
      params_template: {},
    },
    {
      step_number: 4,
      tool_name: 'clear_stale_next_actions',
      params_template: {
        related_to: '{{document_type}}',
      },
    },
  ],
  exit_conditions: ['Immediate — all steps are synchronous'],
  max_duration_hours: 1,
  allows_cancellation: false,
};

const DEADLINE_APPROACHING_FOLLOW_THROUGH: FollowThroughSequence = {
  id: 'deadline-approaching-follow-through',
  name: 'Deadline Approaching Follow-Through',
  description:
    'Triggered when an urgent deadline is within 7 days. Recomputes readiness, creates action cards, and escalates if blockers remain.',
  trigger: 'deadline_within_7_days',
  steps: [
    {
      step_number: 1,
      tool_name: 'recompute_completeness',
      params_template: {},
    },
    {
      step_number: 2,
      tool_name: 'recompute_health_score',
      params_template: {},
    },
    {
      step_number: 3,
      tool_name: 'create_next_action_card',
      params_template: {
        title: 'Deadline approaching: {{deadline_description}}',
        reason:
          'Deadline "{{deadline_description}}" is within 7 days. {{missing_items}} items still outstanding.',
        urgency: 'critical',
        risk_class: 'safe',
      },
    },
    {
      step_number: 4,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Urgent: Deadline "{{deadline_description}}" is approaching. Please review outstanding items.',
        notification_type: 'deadline_approaching',
        target_user_id: '{{deal_owner_id}}',
      },
    },
    {
      step_number: 5,
      tool_name: 'request_manual_review',
      params_template: {
        reason:
          'Deadline "{{deadline_description}}" is within 3 days with outstanding blockers. Human intervention required.',
        context: {
          deadline: '{{deadline_description}}',
          blockers: '{{blocker_summary}}',
        },
      },
      wait_for: 'deadline_within_3_days',
      max_wait_hours: 96,
      condition: 'Deadline is within 3 days and blockers remain',
    },
  ],
  exit_conditions: ['All blockers resolved', 'Deadline passed', 'Manually dismissed'],
  max_duration_hours: 168,
  allows_cancellation: true,
};

const CLOSING_PREP_FOLLOW_THROUGH: FollowThroughSequence = {
  id: 'closing-prep-follow-through',
  name: 'Closing Prep Follow-Through',
  description:
    'Triggered when a transaction enters closing stage. Recomputes closing readiness, creates closing checklist items, and monitors dependencies.',
  trigger: 'stage_entered_closing',
  steps: [
    {
      step_number: 1,
      tool_name: 'recompute_closing_readiness',
      params_template: {},
    },
    {
      step_number: 2,
      tool_name: 'recompute_completeness',
      params_template: {},
    },
    {
      step_number: 3,
      tool_name: 'create_next_action_card',
      params_template: {
        title: 'Closing prep: Review closing readiness',
        reason:
          'Transaction entered closing stage. Review closing readiness and resolve outstanding items.',
        urgency: 'high',
        risk_class: 'safe',
      },
    },
    {
      step_number: 4,
      tool_name: 'create_notification',
      params_template: {
        message:
          'Transaction has entered closing stage. Please review closing readiness and outstanding requirements.',
        notification_type: 'closing_prep',
        target_user_id: '{{deal_owner_id}}',
      },
    },
  ],
  exit_conditions: ['Closing readiness is 100%', 'Transaction closed', 'Manually dismissed'],
  max_duration_hours: 240,
  allows_cancellation: true,
};

// ---------------------------------------------------------------------------
// Sequence Registry
// ---------------------------------------------------------------------------

const BUILT_IN_SEQUENCES: FollowThroughSequence[] = [
  MISSING_DOCUMENT_FOLLOW_THROUGH,
  STALE_APPROVAL_FOLLOW_THROUGH,
  COMPLETENESS_RECOVERY,
  POST_DOCUMENT_UPLOAD_PROCESSING,
  DEADLINE_APPROACHING_FOLLOW_THROUGH,
  CLOSING_PREP_FOLLOW_THROUGH,
];

export function getSequenceById(id: string): FollowThroughSequence | undefined {
  return BUILT_IN_SEQUENCES.find(s => s.id === id);
}

export function getSequenceByTrigger(trigger: string): FollowThroughSequence | undefined {
  return BUILT_IN_SEQUENCES.find(s => s.trigger === trigger);
}

export function getSequenceByName(name: string): FollowThroughSequence | undefined {
  return BUILT_IN_SEQUENCES.find(s => s.name === name);
}

export function getAllSequences(): FollowThroughSequence[] {
  return [...BUILT_IN_SEQUENCES];
}

// ---------------------------------------------------------------------------
// Template Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve `{{placeholder}}` tokens in a params template using trigger data.
 */
function resolveTemplate(
  template: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
        const replacement = data[token];
        return replacement !== undefined ? String(replacement) : `{{${token}}}`;
      });
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      resolved[key] = resolveTemplate(value as Record<string, unknown>, data);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Sequence Execution
// ---------------------------------------------------------------------------

const MAX_STEPS_PER_SEQUENCE = 5;

/**
 * Start a new follow-through sequence for an orchestrator.
 */
export async function startSequence(
  orchestratorId: string,
  sequenceId: string,
  triggerData: Record<string, unknown>,
): Promise<FollowThroughRun | null> {
  const sequence = getSequenceById(sequenceId);
  if (!sequence) {
    console.error(`[follow-through] Unknown sequence: ${sequenceId}`);
    return null;
  }

  // Prevent duplicate active runs of the same sequence for the same orchestrator
  const active = await followThroughRepo.findActiveByOrchestrator(orchestratorId);
  const alreadyRunning = active.find(
    r => r.sequence_name === sequence.name && (r.status === 'active' || r.status === 'waiting'),
  );
  if (alreadyRunning) {
    console.warn(
      `[follow-through] Sequence "${sequence.name}" is already running for orchestrator ${orchestratorId}`,
    );
    return null;
  }

  const run = await followThroughRepo.create({
    orchestrator_id: orchestratorId,
    sequence_name: sequence.name,
    status: 'active',
    current_step: 1,
    trigger_data: triggerData,
    step_results: [],
    next_step_at: null,
    completed_at: null,
    exit_reason: null,
  });

  return run;
}

/**
 * Execute the next pending step in an active follow-through run.
 * Returns true if the step was executed (or the sequence completed/failed).
 */
export async function executeNextStep(
  run: FollowThroughRun,
  context: ToolExecutionContext,
): Promise<boolean> {
  const sequence = getAllSequences().find(s => s.name === run.sequence_name);
  if (!sequence) {
    await followThroughRepo.update(run.id, {
      status: 'failed',
      exit_reason: `Unknown sequence: ${run.sequence_name}`,
      completed_at: new Date().toISOString(),
    });
    return true;
  }

  // Check max duration
  const startedAt = new Date(run.started_at).getTime();
  const maxDurationMs = sequence.max_duration_hours * 60 * 60 * 1000;
  if (Date.now() - startedAt > maxDurationMs) {
    await followThroughRepo.update(run.id, {
      status: 'failed',
      exit_reason: `Max duration exceeded (${sequence.max_duration_hours}h)`,
      completed_at: new Date().toISOString(),
    });
    return true;
  }

  // Safety: enforce max steps
  if (run.current_step > MAX_STEPS_PER_SEQUENCE || run.current_step > sequence.steps.length) {
    await followThroughRepo.complete(run.id, 'All steps completed');
    return true;
  }

  const stepDef = sequence.steps.find((s: FollowThroughStep) => s.step_number === run.current_step);
  if (!stepDef) {
    await followThroughRepo.complete(run.id, 'All steps completed');
    return true;
  }

  // If this step has a wait_for and next_step_at is in the future, skip
  if (stepDef.wait_for && run.next_step_at) {
    const nextStepTime = new Date(run.next_step_at).getTime();
    if (Date.now() < nextStepTime) {
      return false; // Not time yet
    }
  }

  // Resolve template parameters
  const resolvedParams = resolveTemplate(stepDef.params_template, run.trigger_data);

  // Execute the tool
  const tool = getTool(stepDef.tool_name);
  const stepResult: Record<string, unknown> = {
    step_number: stepDef.step_number,
    tool_name: stepDef.tool_name,
    executed_at: new Date().toISOString(),
  };

  if (!tool) {
    stepResult.success = false;
    stepResult.error = `Tool not found: ${stepDef.tool_name}`;
  } else {
    try {
      const toolResult = await tool.execute(resolvedParams, context);
      stepResult.success = toolResult.success;
      stepResult.result = toolResult.result;
      stepResult.side_effects = toolResult.side_effects;
    } catch (error) {
      stepResult.success = false;
      stepResult.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Append step result
  const updatedResults = [...(run.step_results as Record<string, unknown>[]), stepResult];
  const nextStepNumber = run.current_step + 1;
  const nextStepDef = sequence.steps.find((s: FollowThroughStep) => s.step_number === nextStepNumber);

  // Determine next state
  if (!nextStepDef || nextStepNumber > sequence.steps.length) {
    // Sequence complete
    await followThroughRepo.update(run.id, {
      current_step: nextStepNumber,
      step_results: updatedResults,
      status: 'completed',
      exit_reason: 'All steps completed',
      completed_at: new Date().toISOString(),
    });
  } else if (nextStepDef.wait_for && nextStepDef.max_wait_hours) {
    // Next step requires waiting
    const waitUntil = new Date(
      Date.now() + nextStepDef.max_wait_hours * 60 * 60 * 1000,
    ).toISOString();
    await followThroughRepo.update(run.id, {
      current_step: nextStepNumber,
      step_results: updatedResults,
      status: 'waiting',
      next_step_at: waitUntil,
    });
  } else {
    // Proceed immediately to next step
    await followThroughRepo.update(run.id, {
      current_step: nextStepNumber,
      step_results: updatedResults,
      status: 'active',
      next_step_at: null,
    });
  }

  // Record memory
  await memoryRepo.create({
    orchestrator_id: context.orchestratorId,
    memory_type: 'action_taken',
    summary: `Follow-through "${run.sequence_name}" step ${stepDef.step_number}: ${stepDef.tool_name}`,
    details: {
      sequence_name: run.sequence_name,
      run_id: run.id,
      step: stepResult,
    },
    resolved: true,
    resolved_at: new Date().toISOString(),
    expires_at: null,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Trigger Detection
// ---------------------------------------------------------------------------

/**
 * Evaluate the current world state to determine which follow-through sequences
 * should be triggered. Returns an array of { sequenceId, triggerData } objects.
 */
export function detectTriggers(
  worldState: WorldStateSnapshot,
  activeTriggerData?: Record<string, unknown>,
): { sequenceId: string; triggerData: Record<string, unknown> }[] {
  const triggers: { sequenceId: string; triggerData: Record<string, unknown> }[] = [];

  // Missing document detection
  if (worldState.missing_docs.length > 0) {
    for (const docType of worldState.missing_docs) {
      triggers.push({
        sequenceId: 'missing-document-follow-through',
        triggerData: {
          document_type: docType,
          assigned_agent_id: worldState.ownership.owner_id ?? '',
          entity_id: worldState.entity_id,
        },
      });
    }
  }

  // Stale approval detection (pending_approvals > 0 checked by world state,
  // but the 48h threshold must be signalled by the caller via activeTriggerData)
  if (activeTriggerData?.stale_approvals) {
    const staleApprovals = activeTriggerData.stale_approvals as Array<{
      description: string;
      approver_user_id: string;
      pending_since: string;
    }>;
    for (const approval of staleApprovals) {
      triggers.push({
        sequenceId: 'stale-approval-follow-through',
        triggerData: {
          approval_description: approval.description,
          approver_user_id: approval.approver_user_id,
          pending_since: approval.pending_since,
        },
      });
    }
  }

  // Completeness drop detection
  if (worldState.completeness_score < 50) {
    triggers.push({
      sequenceId: 'completeness-recovery',
      triggerData: {
        current_score: worldState.completeness_score,
        deal_owner_id: worldState.ownership.owner_id ?? '',
        entity_id: worldState.entity_id,
      },
    });
  }

  // Deadline approaching detection
  if (worldState.urgent_deadlines && worldState.urgent_deadlines.length > 0) {
    for (const deadline of worldState.urgent_deadlines) {
      const deadlineDate = typeof deadline === 'string' ? deadline : (deadline as { date?: string }).date;
      const deadlineDesc = typeof deadline === 'string' ? deadline : (deadline as { description?: string }).description ?? deadline;
      if (deadlineDate) {
        const daysUntil = (new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntil <= 7 && daysUntil > 0) {
          triggers.push({
            sequenceId: 'deadline-approaching-follow-through',
            triggerData: {
              deadline_description: String(deadlineDesc),
              deal_owner_id: worldState.ownership?.owner_id ?? '',
              missing_items: worldState.missing_docs.length + worldState.pending_approvals,
              blocker_summary: worldState.unresolved_exceptions > 0
                ? `${worldState.unresolved_exceptions} unresolved exceptions`
                : 'None',
            },
          });
          break; // Only trigger once for the nearest deadline
        }
      }
    }
  }

  // Closing stage entry detection
  if (
    worldState.stage === 'closing' &&
    activeTriggerData?.stage_transition?.toString().includes('closing')
  ) {
    triggers.push({
      sequenceId: 'closing-prep-follow-through',
      triggerData: {
        deal_owner_id: worldState.ownership?.owner_id ?? '',
      },
    });
  }

  // Document upload is event-driven — triggered via activeTriggerData
  if (activeTriggerData?.document_uploaded) {
    const uploadData = activeTriggerData.document_uploaded as {
      document_type: string;
    };
    triggers.push({
      sequenceId: 'post-document-upload-processing',
      triggerData: {
        document_type: uploadData.document_type,
        entity_id: worldState.entity_id,
      },
    });
  }

  return triggers;
}

// ---------------------------------------------------------------------------
// Exit Condition Evaluation
// ---------------------------------------------------------------------------

/**
 * Check whether an active follow-through run should be exited early
 * based on the current world state.
 */
export function shouldExitEarly(
  run: FollowThroughRun,
  worldState: WorldStateSnapshot,
): string | null {
  switch (run.sequence_name) {
    case 'Missing Document Follow-Through': {
      // Exit if the specific document type has been uploaded
      const docType = (run.trigger_data as Record<string, unknown>).document_type as string;
      if (docType && !worldState.missing_docs.includes(docType)) {
        return 'Document uploaded';
      }
      break;
    }
    case 'Stale Approval Follow-Through': {
      // Exit if pending approvals dropped (approval was decided)
      if (worldState.pending_approvals === 0) {
        return 'Approval decided';
      }
      break;
    }
    case 'Completeness Recovery': {
      // Exit if completeness has recovered above 60%
      if (worldState.completeness_score > 60) {
        return 'Completeness recovered above 60%';
      }
      break;
    }
    case 'Post-Document Upload Processing': {
      // This sequence is immediate; no early exit needed
      break;
    }
    case 'Deadline Approaching Follow-Through': {
      // Exit if all blockers are resolved
      if (
        worldState.missing_docs.length === 0 &&
        worldState.pending_approvals === 0 &&
        worldState.unresolved_exceptions === 0
      ) {
        return 'All blockers resolved';
      }
      break;
    }
    case 'Closing Prep Follow-Through': {
      // Exit if transaction closed or closing readiness is 100%
      if (worldState.stage === 'closed') {
        return 'Transaction closed';
      }
      if (worldState.completeness_score >= 100) {
        return 'Closing readiness is 100%';
      }
      break;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Integration: Process Follow-Through Sequences
// ---------------------------------------------------------------------------

/**
 * Called at the end of each orchestration cycle. Handles:
 * 1. Detecting new triggers and starting sequences
 * 2. Checking exit conditions on active/waiting sequences
 * 3. Executing next steps on active sequences
 */
export async function processFollowThroughSequences(
  orchestratorId: string,
  worldState: WorldStateSnapshot,
  context: ToolExecutionContext,
  triggerData?: Record<string, unknown>,
): Promise<{
  started: number;
  advanced: number;
  completed: number;
  cancelled: number;
}> {
  const stats = { started: 0, advanced: 0, completed: 0, cancelled: 0 };

  // 1. Detect new triggers and start sequences
  const detectedTriggers = detectTriggers(worldState, triggerData);
  for (const trigger of detectedTriggers) {
    const run = await startSequence(orchestratorId, trigger.sequenceId, trigger.triggerData);
    if (run) {
      stats.started++;
      // For immediate sequences (max_duration <= 1h), execute all steps now
      const seq = getSequenceById(trigger.sequenceId);
      if (seq && seq.max_duration_hours <= 1) {
        let freshRun = run;
        while (
          freshRun.status === 'active' &&
          freshRun.current_step <= seq.steps.length
        ) {
          const didExecute = await executeNextStep(freshRun, context);
          if (!didExecute) break;
          const updated = await followThroughRepo.findById(freshRun.id);
          if (!updated) break;
          freshRun = updated;
          stats.advanced++;
        }
        if (freshRun.status === 'completed') {
          stats.completed++;
        }
      }
    }
  }

  // 2. Check active and waiting sequences
  const activeRuns = await followThroughRepo.findActiveByOrchestrator(orchestratorId);

  for (const run of activeRuns) {
    // Check exit conditions
    const exitReason = shouldExitEarly(run, worldState);
    if (exitReason) {
      await followThroughRepo.complete(run.id, exitReason);
      stats.completed++;
      continue;
    }

    // Execute next step for active (non-waiting) runs
    if (run.status === 'active') {
      const didExecute = await executeNextStep(run, context);
      if (didExecute) {
        stats.advanced++;
        // Re-check if completed
        const updated = await followThroughRepo.findById(run.id);
        if (updated?.status === 'completed') {
          stats.completed++;
        }
      }
    }
  }

  return stats;
}
