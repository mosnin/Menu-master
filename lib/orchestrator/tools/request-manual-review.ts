import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { createApproval } from '@/lib/services/approval-service';

const contract: ToolContract = {
  name: 'request_manual_review',
  description: 'Request a manual review of extracted data or AI-generated content.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: false,
  params_schema: {
    reason: { type: 'string', required: false, description: 'Reason for requesting manual review' },
    payload: { type: 'object', required: false, description: 'Additional context for the reviewer' },
  },
  side_effects: ['Creates approval record of type extraction_review'],
};

const execute: ToolExecutor = async (params, context) => {
  const approval = await createApproval({
    orgId: context.organizationId,
    transactionId: context.entityId,
    approvalType: 'extraction_review',
    requestedByUserId: context.actorUserId || context.orchestratorId,
    payload: {
      ...(params.payload as Record<string, unknown> || {}),
      reason: params.reason ?? 'Orchestrator requested manual review',
      source: 'orchestrator',
      orchestrator_id: context.orchestratorId,
    },
  });

  return {
    success: true,
    result: { approval_id: approval.id, status: approval.status },
    side_effects: [
      { type: 'approval_created', description: 'Manual review requested', target_id: approval.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
