import crypto from 'crypto';
import { getTool } from './tool-registry';
import type { ToolExecutionContext } from './tool-registry';
import type { OrchestratorActionProposal, OrchestratorActionExecution, ActionRiskClass } from '@/types';
import * as actionRepo from '@/lib/repositories/orchestrator-actions';
import * as memoryRepo from '@/lib/repositories/orchestrator-memory';
import { logAction } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTER_TOOL_DELAY_MS = 100;

function generateIdempotencyKey(cycleId: string, toolName: string, params: unknown): string {
  const raw = `${cycleId}-${toolName}-${JSON.stringify(params)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Risk gating rules
// ---------------------------------------------------------------------------

type GatingResult =
  | { allowed: true }
  | { allowed: false; reason: string; gated_as: 'gated' | 'rejected' };

function checkRiskGating(riskClass: ActionRiskClass, criticApproved: boolean | null): GatingResult {
  // Safe actions can always execute if critic didn't reject
  if (riskClass === 'safe') {
    if (criticApproved === false) {
      return { allowed: false, reason: 'Critic rejected this safe action', gated_as: 'rejected' };
    }
    return { allowed: true };
  }

  // Medium-risk actions execute as drafts/suggestions (we still execute but log as gated)
  if (riskClass === 'medium_risk') {
    if (criticApproved === false) {
      return { allowed: false, reason: 'Critic rejected this medium-risk action', gated_as: 'rejected' };
    }
    // Medium risk actions proceed but are recorded as gated for audit
    return { allowed: true };
  }

  // High-risk actions are always blocked behind approval
  if (riskClass === 'high_risk') {
    return {
      allowed: false,
      reason: 'High-risk actions require explicit human approval before execution',
      gated_as: 'gated',
    };
  }

  return { allowed: false, reason: `Unknown risk class: ${riskClass}`, gated_as: 'rejected' };
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export async function executeApprovedActions(
  proposals: OrchestratorActionProposal[],
  context: ToolExecutionContext,
): Promise<OrchestratorActionExecution[]> {
  const executions: OrchestratorActionExecution[] = [];

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

    // 2. Check risk gating
    const gating = checkRiskGating(proposal.risk_class, proposal.critic_approved);

    if (gating.allowed === false) {
      // Update proposal status
      await actionRepo.updateProposal(proposal.id, {
        status: gating.gated_as,
        gated_reason: gating.reason,
      });

      const auditAction = gating.gated_as === 'gated'
        ? 'orchestrator.action_gated' as const
        : 'orchestrator.action_rejected' as const;

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
          gated_reason: gating.reason,
          status: gating.gated_as,
        },
      });

      // Record a non-executed entry
      const execution = await actionRepo.createExecution({
        proposal_id: proposal.id,
        orchestrator_id: context.orchestratorId,
        tool_name: proposal.tool_name,
        tool_params: proposal.tool_params,
        result: { gated: true, reason: gating.reason },
        success: false,
        error_message: gating.reason,
        duration_ms: Date.now() - startTime,
        side_effects: [],
        idempotency_key: idempotencyKey,
      });
      executions.push(execution);
      continue;
    }

    // 3. Execute the tool
    try {
      const toolResult = await tool.execute(proposal.tool_params, context);
      const durationMs = Date.now() - startTime;

      // 4. Store execution record
      const execution = await actionRepo.createExecution({
        proposal_id: proposal.id,
        orchestrator_id: context.orchestratorId,
        tool_name: proposal.tool_name,
        tool_params: proposal.tool_params,
        result: toolResult.result,
        success: toolResult.success,
        error_message: null,
        duration_ms: durationMs,
        side_effects: toolResult.side_effects,
        idempotency_key: idempotencyKey,
      });

      // 5. Update proposal status
      await actionRepo.updateProposal(proposal.id, {
        status: toolResult.success ? 'executed' : 'failed',
      });

      // 6. Store memory entry for action taken
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
        },
        resolved: true,
        resolved_at: new Date().toISOString(),
        expires_at: null,
      });

      // 7. Audit log
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
