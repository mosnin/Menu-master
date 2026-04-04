import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { createApproval } from '@/lib/services/approval-service';
import type { ApprovalType } from '@/types';

const contract: ToolContract = {
  name: 'create_approval_request',
  description: 'Create an approval request for content that needs human sign-off before proceeding.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    approval_type: { type: 'string', required: true, description: 'Type of approval: outbound_email, extraction_review, checklist_review' },
    reason: { type: 'string', required: false, description: 'Reason for the approval request' },
    payload: { type: 'object', required: false, description: 'Payload containing the content to approve' },
  },
  side_effects: ['Creates approval record'],
};

const execute: ToolExecutor = async (params, context) => {
  const approvalType = (params.approval_type as ApprovalType) || 'checklist_review';

  const approval = await createApproval({
    orgId: context.organizationId,
    transactionId: context.entityId,
    approvalType,
    requestedByUserId: context.actorUserId || context.orchestratorId,
    payload: {
      reason: params.reason ?? 'Orchestrator-initiated approval',
      source: 'orchestrator',
      orchestrator_id: context.orchestratorId,
      ...(params.payload as Record<string, unknown> || {}),
    },
  });

  return {
    success: true,
    result: { approval_id: approval.id, approval_type: approvalType, status: approval.status },
    side_effects: [
      { type: 'approval_created', description: `Approval request created (${approvalType})`, target_id: approval.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
