import { evaluatePolicy } from '@/lib/orchestrator/action-policy';
import { getTool } from '@/lib/orchestrator/tool-registry';
import { registerAllTools } from '@/lib/orchestrator/tools';
import { createTraceEvent } from '@/lib/repositories/automation-trace-events';
import type { ActionRiskClass, PolicyContext, PolicyDecision, UserRole } from '@/types';

export interface SharedAutomationExecutionInput {
  organizationId: string;
  sourceSystem: 'workflow' | 'orchestrator' | 'agent_node';
  toolName: string;
  toolParams: Record<string, unknown>;
  riskClass: ActionRiskClass;
  confidence: number;
  entityType: 'transaction' | 'listing';
  entityId: string;
  actorRole: UserRole;
  complianceFlags?: string[];
  worldStage?: string;
  workflowRunId?: string;
  workflowRunStepId?: string;
  orchestratorId?: string;
  orchestratorCycleId?: string;
  orchestratorProposalId?: string;
}

export interface SharedAutomationExecutionResult {
  policyDecision: PolicyDecision;
  executed: boolean;
  success: boolean;
  result: Record<string, unknown>;
  sideEffects: { type: string; description: string; target_id?: string }[];
  errorMessage?: string;
}

export async function executeToolWithPolicy(
  input: SharedAutomationExecutionInput,
): Promise<SharedAutomationExecutionResult> {
  registerAllTools();
  const tool = getTool(input.toolName);

  if (!tool) {
    const policyDecision: PolicyDecision = {
      disposition: 'block',
      reason: `Tool not found: ${input.toolName}`,
      policy_rule: 'tool_not_found',
      can_override: false,
    };

    await recordPolicyTrace(input, policyDecision, 'Tool lookup failed');
    return {
      policyDecision,
      executed: false,
      success: false,
      result: {},
      sideEffects: [],
      errorMessage: policyDecision.reason,
    };
  }

  const policyContext: PolicyContext = {
    toolName: input.toolName,
    riskClass: input.riskClass,
    confidence: input.confidence,
    entityType: input.entityType,
    actorRole: input.actorRole,
    complianceFlags: input.complianceFlags ?? [],
    worldStage: input.worldStage ?? 'active',
  };

  const policyDecision = evaluatePolicy(policyContext);
  await recordPolicyTrace(input, policyDecision, 'Policy evaluated for shared automation tool execution');

  if (policyDecision.disposition !== 'auto_execute') {
    return {
      policyDecision,
      executed: false,
      success: false,
      result: {},
      sideEffects: [],
      errorMessage: policyDecision.reason,
    };
  }

  try {
    const toolResult = await tool.execute(input.toolParams, {
      orchestratorId: input.orchestratorId ?? `workflow:${input.workflowRunId ?? 'n/a'}`,
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
    });

    await createTraceEvent({
      organization_id: input.organizationId,
      source_system: input.sourceSystem,
      status: toolResult.success ? 'executed' : 'failed',
      workflow_run_id: input.workflowRunId ?? null,
      workflow_run_step_id: input.workflowRunStepId ?? null,
      orchestrator_id: input.orchestratorId ?? null,
      orchestrator_cycle_id: input.orchestratorCycleId ?? null,
      orchestrator_proposal_id: input.orchestratorProposalId ?? null,
      tool_name: input.toolName,
      tool_params: input.toolParams,
      policy_disposition: policyDecision.disposition,
      policy_rule: policyDecision.policy_rule,
      policy_reason: policyDecision.reason,
      outcome_summary: toolResult.success ? 'Tool executed successfully' : 'Tool execution failed',
      metadata: {
        side_effects_count: toolResult.side_effects.length,
      },
    });

    return {
      policyDecision,
      executed: true,
      success: toolResult.success,
      result: toolResult.result,
      sideEffects: toolResult.side_effects,
      errorMessage: toolResult.success ? undefined : JSON.stringify(toolResult.result),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
    await createTraceEvent({
      organization_id: input.organizationId,
      source_system: input.sourceSystem,
      status: 'failed',
      workflow_run_id: input.workflowRunId ?? null,
      workflow_run_step_id: input.workflowRunStepId ?? null,
      orchestrator_id: input.orchestratorId ?? null,
      orchestrator_cycle_id: input.orchestratorCycleId ?? null,
      orchestrator_proposal_id: input.orchestratorProposalId ?? null,
      tool_name: input.toolName,
      tool_params: input.toolParams,
      policy_disposition: policyDecision.disposition,
      policy_rule: policyDecision.policy_rule,
      policy_reason: policyDecision.reason,
      outcome_summary: errorMessage,
    });

    return {
      policyDecision,
      executed: true,
      success: false,
      result: {},
      sideEffects: [],
      errorMessage,
    };
  }
}

async function recordPolicyTrace(
  input: SharedAutomationExecutionInput,
  policyDecision: PolicyDecision,
  summary: string,
) {
  await createTraceEvent({
    organization_id: input.organizationId,
    source_system: input.sourceSystem,
    status: policyDecision.disposition,
    workflow_run_id: input.workflowRunId ?? null,
    workflow_run_step_id: input.workflowRunStepId ?? null,
    orchestrator_id: input.orchestratorId ?? null,
    orchestrator_cycle_id: input.orchestratorCycleId ?? null,
    orchestrator_proposal_id: input.orchestratorProposalId ?? null,
    tool_name: input.toolName,
    tool_params: input.toolParams,
    policy_disposition: policyDecision.disposition,
    policy_rule: policyDecision.policy_rule,
    policy_reason: policyDecision.reason,
    outcome_summary: summary,
  });
}
