import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as recommendationRepo from '@/lib/repositories/transaction-recommendations';
import { logAction } from '@/lib/audit/logger';

const contract: ToolContract = {
  name: 'suggest_stage_transition',
  description: 'Create a recommendation for transitioning the deal to a new stage. Requires broker admin approval.',
  risk_class: 'high_risk',
  required_role: 'broker_admin',
  idempotent: false,
  params_schema: {
    target_stage: { type: 'string', required: true, description: 'The target stage to transition to' },
    reason: { type: 'string', required: true, description: 'Reason for the stage transition recommendation' },
    confidence: { type: 'number', required: false, description: 'Confidence level (0-1)' },
  },
  side_effects: ['Creates transaction_recommendation record'],
};

const execute: ToolExecutor = async (params, context) => {
  const targetStage = params.target_stage as string;
  const reason = params.reason as string;
  const confidence = (params.confidence as number) ?? 0.7;

  const recommendation = await recommendationRepo.create({
    transaction_id: context.entityId,
    title: `Stage transition: move to ${targetStage}`,
    reason,
    confidence,
    risk_level: 'high',
    source_signals: [{ type: 'orchestrator', orchestrator_id: context.orchestratorId }],
    suggested_owner_id: null,
    action_type: 'stage_transition',
    action_payload: { target_stage: targetStage },
    status: 'pending',
    executed_at: null,
  });

  await logAction({
    organizationId: context.organizationId,
    transactionId: context.entityId,
    actorType: 'ai',
    action: 'recommendation.generated',
    targetType: 'transaction_recommendation',
    targetId: recommendation.id,
    metadata: { action_type: 'stage_transition', target_stage: targetStage, source: 'orchestrator' },
  });

  return {
    success: true,
    result: { recommendation_id: recommendation.id, target_stage: targetStage, status: 'pending' },
    side_effects: [
      { type: 'recommendation_created', description: `Stage transition suggested: ${targetStage}`, target_id: recommendation.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
