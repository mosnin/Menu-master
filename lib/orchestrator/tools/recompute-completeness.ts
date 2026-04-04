import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { recalculateCompleteness } from '@/lib/services/completeness-service';

const contract: ToolContract = {
  name: 'recompute_completeness',
  description: 'Recalculate the completeness score for a transaction based on fields, documents, and checklist progress.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {},
  side_effects: ['Updates transaction_completeness record'],
};

const execute: ToolExecutor = async (_params, context) => {
  const result = await recalculateCompleteness(context.entityId);
  return {
    success: true,
    result: {
      completeness_score: result.completeness_score,
      readiness_state: result.readiness_state,
      missing_documents: result.missing_documents,
      blockers: result.blockers,
    },
    side_effects: [
      {
        type: 'completeness_updated',
        description: `Completeness recalculated: ${result.completeness_score}% (${result.readiness_state})`,
        target_id: result.id,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
