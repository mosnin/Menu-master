import crypto from 'crypto';
import { getTool } from './tool-registry';
import type { ToolExecutionContext } from './tool-registry';
import type {
  OrchestratorActionProposal,
  OrchestratorActionExecution,
  PolicyContext,
  PolicyDecision,
  OrgPolicyOverrides,
} from '@/types';
import * as actionRepo from '@/lib/repositories/orchestrator-actions';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';
import { logAction } from '@/lib/audit/logger';
import { evaluatePolicy } from './action-policy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTER_TOOL_DELAY_MS = 100;
const MAX_SAFE_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const ACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between duplicate tool+params executions

function generateIdempotencyKey(cycleId: string, toolName: string, params: unknown): string {
  const raw = `${cycleId}-${toolName}-${JSON.stringify(params)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if the same tool+params was executed recently (within cooldown window).
 * Prevents action churn when repeated cycles propose the same action.
 */
async function isInCooldown(
  orchestratorId: string,
  toolName: string,
  toolParams: unknown,
): Promise<boolean> {
  const recentExecutions = await actionRepo.findRecentExecutions(orchestratorId, 20);
  const cooldownThreshold = new Date(Date.now() - ACTION_COOLDOWN_MS).toISOString();

  return recentExecutions.some(
    e =>
      e.tool_name === toolName &&
      e.success &&
      e.created_at > cooldownThreshold &&
      JSON.stringify(e.tool_params) === JSON.stringify(toolParams),
  );
}

// ---------------------------------------------------------------------------
// Policy context builder
// ---------------------------------------------------------------------------

export interface ExecutionPolicyContext {
  entityType: 'transaction' | 'listing';
  actorRole: import('@/types').UserRole;
  complianceFlags: string[];
  orgPolicyOverrides?: OrgPolicyOverrides;
  worldStage: string;
  /** Active plan ID for linking executions to plan context */
  activePlanId?: string;
  /** Map of tool_name -> subgoal_id for linking executions to subgoals */
  toolToSubgoalMap?: Map<string, string>;
}

function buildPolicyContext(
  proposal: OrchestratorActionProposal,
  policyCtx: ExecutionPolicyContext,
): PolicyContext {
  return {
    toolName: proposal.tool_name,
    riskClass: proposal.risk_class,
    confidence: proposal.confidence,
    entityType: policyCtx.entityType,
    actorRole: policyCtx.actorRole,
    complianceFlags: policyCtx.complianceFlags,
    orgPolicyOverrides: policyCtx.orgPolicyOverrides,
    worldStage: policyCtx.worldStage,
  };
}

/**
 * Map a policy disposition to the proposal status used in the database.
 */
function dispositionToProposalStatus(disposition: import('@/types').ActionDisposition): string {
  switch (disposition) {
    case 'auto_execute':
      return 'approved';
    case 'create_draft':
      return 'gated';
    case 'create_approval':
      return 'gated';
    case 'block':
      return 'rejected';
    default:
      return 'rejected';
  }
}

/**
 * Map a policy disposition to the appropriate audit action.
 */
function dispositionToAuditAction(
  disposition: import('@/types').ActionDisposition,
): 'orchestrator.action_executed' | 'orchestrator.action_gated' | 'orchestrator.action_rejected' {
  switch (disposition) {
    case 'auto_execute':
      return 'orchestrator.action_executed';
    case 'create_draft':
    case 'create_approval':
      return 'orchestrator.action_gated';
    case 'block':
      return 'orchestrator.action_rejected';
    default:
      return 'orchestrator.action_rejected';
  }
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export async function executeApprovedActions(
  proposals: OrchestratorActionProposal[],
  context: ToolExecutionContext,
  policyCtx?: ExecutionPolicyContext,
): Promise<OrchestratorActionExecution[]> {
  const executions: OrchestratorActionExecution[] = [];

  // Default policy context when not provided (backwards-compatible)
  const effectivePolicyCtx: ExecutionPolicyContext = policyCtx ?? {
    entityType: context.entityType,
    actorRole: 'agent',
    complianceFlags: [],
    orgPolicyOverrides: undefined,
    worldStage: 'active',
  };

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    const startTime = Date.now();

    // Add delay between tool executions to avoid overwhelming downstream services
    if (i > 0) {
      await delay(INTER_TOOL_DELAY_MS);
    }

    // 1. Check idempotency – skip if already executed
    const idempotencyKey = generateIdempotencyKey(proposal.cycle_id, proposal.tool_name, proposal.tool_params);
    const existingExecution = await actionRepo.findByIdempotencyKey(idempotencyKey);
    if (existingExecution) {
      executions.push(existingExecution);
      continue;
    }

    // 2. Get tool from registry
    const tool = getTool(proposal.tool_name);
    if (!tool) {
      const execution = await recordFailedExecution(proposal, context, startTime, `Tool not found: ${proposal.tool_name}`, idempotencyKey);
      executions.push(execution);
      continue;
    }

    // 2a. Check cooldown — skip if same tool+params executed recently
    const inCooldown = await isInCooldown(context.orchestratorId, proposal.tool_name, proposal.tool_params);
    if (inCooldown) {
      const execution = await recordPolicyDecision(proposal, context, startTime, idempotencyKey, {
        disposition: 'block',
        reason: `Action "${proposal.tool_name}" was already executed recently (cooldown)`,
        policy_rule: 'action_cooldown',
        can_override: false,
      });
      executions.push(execution);
      continue;
    }

    // 3. Evaluate action policy
    const policyContext = buildPolicyContext(proposal, effectivePolicyCtx);
    const policyDecision = evaluatePolicy(policyContext);

    // Also respect critic rejection — if the critic explicitly rejected, block regardless
    if (proposal.critic_approved === false) {
      const execution = await recordPolicyDecision(proposal, context, startTime, idempotencyKey, {
        disposition: 'block',
        reason: 'Critic rejected this action',
        policy_rule: 'critic_rejection',
        can_override: false,
      });
      executions.push(execution);
      continue;
    }

    // 4. Handle non-auto_execute dispositions
    if (policyDecision.disposition !== 'auto_execute') {
      const execution = await recordPolicyDecision(
        proposal,
        context,
        startTime,
        idempotencyKey,
        policyDecision,
      );
      executions.push(execution);
      continue;
    }

    // 5. auto_execute — run the tool (with retry for safe actions)
    let toolResult: Awaited<ReturnType<typeof tool.execute>> | null = null;
    let lastError: string | null = null;
    const maxAttempts = proposal.risk_class === 'safe' ? MAX_SAFE_RETRIES + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        toolResult = await tool.execute(proposal.tool_params, context);
        if (toolResult.success) break;
        lastError = JSON.stringify(toolResult.result);
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        toolResult = null;
      }
      if (attempt < maxAttempts) {
        await delay(RETRY_DELAY_MS * attempt); // exponential-ish backoff
      }
    }

    try {
      if (!toolResult || !toolResult.success) {
        throw new Error(lastError ?? 'All retry attempts failed');
      }
      const durationMs = Date.now() - startTime;

      // Store execution record
      const execution = await actionRepo.createExecution({
        proposal_id: proposal.id,
        orchestrator_id: context.orchestratorId,
        tool_name: proposal.tool_name,
        tool_params: proposal.tool_params,
        result: {
          ...toolResult.result,
          policy_decision: {
            disposition: policyDecision.disposition,
            policy_rule: policyDecision.policy_rule,
          },
          plan_context: effectivePolicyCtx.activePlanId
            ? {
                plan_id: effectivePolicyCtx.activePlanId,
                subgoal_id: effectivePolicyCtx.toolToSubgoalMap?.get(proposal.tool_name) ?? null,
              }
            : undefined,
        },
        success: toolResult.success,
        error_message: null,
        duration_ms: durationMs,
        side_effects: toolResult.side_effects,
        idempotency_key: idempotencyKey,
      });

      // Update proposal status
      await actionRepo.updateProposal(proposal.id, {
        status: toolResult.success ? 'executed' : 'failed',
      });

      // Store memory entry for action taken
      await memoryRepo.create({
        orchestrator_id: context.orchestratorId,
        memory_type: 'action_taken',
        summary: `Executed ${proposal.tool_name}: ${proposal.reason}`,
        details: {
          tool_name: proposal.tool_name,
          params: proposal.tool_params,
          success: toolResult.success,
          result: toolResult.result,
          side_effects: toolResult.side_effects,
          policy_decision: {
            disposition: policyDecision.disposition,
            policy_rule: policyDecision.policy_rule,
          },
        },
        resolved: true,
        resolved_at: new Date().toISOString(),
        expires_at: null,
      });

      // Audit log
      await logAction({
        organizationId: context.organizationId,
        transactionId: context.entityType === 'transaction' ? context.entityId : undefined,
        actorType: 'ai',
        action: 'orchestrator.action_executed',
        targetType: 'orchestrator_action',
        targetId: execution.id,
        metadata: {
          tool_name: proposal.tool_name,
          risk_class: proposal.risk_class,
          success: toolResult.success,
          duration_ms: durationMs,
          side_effects_count: toolResult.side_effects.length,
          policy_disposition: policyDecision.disposition,
          policy_rule: policyDecision.policy_rule,
        },
      });

      executions.push(execution);
    } catch (error) {
      const execution = await recordFailedExecution(
        proposal,
        context,
        startTime,
        error instanceof Error ? error.message : 'Unknown execution error',
        idempotencyKey,
      );
      executions.push(execution);
    }
  }

  return executions;
}

/**
 * Record a policy decision that prevents direct execution (draft, approval, or block).
 */
async function recordPolicyDecision(
  proposal: OrchestratorActionProposal,
  context: ToolExecutionContext,
  startTime: number,
  idempotencyKey: string,
  policyDecision: PolicyDecision,
): Promise<OrchestratorActionExecution> {
  const status = dispositionToProposalStatus(policyDecision.disposition);
  const auditAction = dispositionToAuditAction(policyDecision.disposition);

  // Update proposal status
  await actionRepo.updateProposal(proposal.id, {
    status: status as import('@/types').ActionProposalStatus,
    gated_reason: policyDecision.reason,
  });

  // Audit log
  await logAction({
    organizationId: context.organizationId,
    transactionId: context.entityType === 'transaction' ? context.entityId : undefined,
    actorType: 'ai',
    action: auditAction,
    targetType: 'orchestrator_action',
    targetId: proposal.id,
    metadata: {
      tool_name: proposal.tool_name,
      risk_class: proposal.risk_class,
      policy_disposition: policyDecision.disposition,
      policy_rule: policyDecision.policy_rule,
      policy_reason: policyDecision.reason,
      escalation_target: policyDecision.escalation_target,
      can_override: policyDecision.can_override,
      status,
    },
  });

  // Record a non-executed entry with the policy decision
  return actionRepo.createExecution({
    proposal_id: proposal.id,
    orchestrator_id: context.orchestratorId,
    tool_name: proposal.tool_name,
    tool_params: proposal.tool_params,
    result: {
      policy_decision: {
        disposition: policyDecision.disposition,
        reason: policyDecision.reason,
        policy_rule: policyDecision.policy_rule,
        escalation_target: policyDecision.escalation_target,
        can_override: policyDecision.can_override,
      },
    },
    success: false,
    error_message: policyDecision.reason,
    duration_ms: Date.now() - startTime,
    side_effects: [],
    idempotency_key: idempotencyKey,
  });
}

async function recordFailedExecution(
  proposal: OrchestratorActionProposal,
  context: ToolExecutionContext,
  startTime: number,
  errorMessage: string,
  idempotencyKey: string,
): Promise<OrchestratorActionExecution> {
  const durationMs = Date.now() - startTime;

  await actionRepo.updateProposal(proposal.id, { status: 'failed' });

  // Record failure in memory for pattern detection
  await memoryRepo.create({
    orchestrator_id: context.orchestratorId,
    memory_type: 'failure_pattern',
    summary: `Failed to execute ${proposal.tool_name}: ${errorMessage}`,
    details: {
      tool_name: proposal.tool_name,
      params: proposal.tool_params,
      error: errorMessage,
    },
    resolved: false,
    resolved_at: null,
    expires_at: null,
  });

  return actionRepo.createExecution({
    proposal_id: proposal.id,
    orchestrator_id: context.orchestratorId,
    tool_name: proposal.tool_name,
    tool_params: proposal.tool_params,
    result: { error: errorMessage },
    success: false,
    error_message: errorMessage,
    duration_ms: durationMs,
    side_effects: [],
    idempotency_key: idempotencyKey,
  });
}
