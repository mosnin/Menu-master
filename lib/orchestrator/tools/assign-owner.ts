import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { assignTransaction } from '@/lib/services/assignment-service';

const contract: ToolContract = {
  name: 'assign_owner',
  description: 'Assign an owner (agent, coordinator, or broker reviewer) to a transaction.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: true,
  params_schema: {
    user_id: { type: 'string', required: true, description: 'User ID to assign' },
    role: { type: 'string', required: true, description: 'Assignment role: primary_agent, coordinator_owner, or broker_reviewer' },
  },
  side_effects: ['Creates or updates transaction_assignment record'],
};

const execute: ToolExecutor = async (params, context) => {
  const userId = params.user_id as string;
  const role = params.role as 'primary_agent' | 'coordinator_owner' | 'broker_reviewer';

  if (!userId || !role) {
    return {
      success: false,
      result: { error: 'Missing required parameters: user_id, role' },
      side_effects: [],
    };
  }

  const assignment = await assignTransaction(
    context.entityId,
    userId,
    role,
    context.actorUserId || context.orchestratorId,
  );

  return {
    success: true,
    result: { assignment_id: assignment.id, user_id: userId, role },
    side_effects: [
      { type: 'assignment_created', description: `Assigned ${role} to user ${userId}`, target_id: assignment.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
