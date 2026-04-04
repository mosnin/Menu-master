import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { computeClosingReadiness } from '@/lib/services/closing-readiness-service';

const contract: ToolContract = {
  name: 'recompute_closing_readiness',
  description: 'Evaluate closing readiness by checking documents, approvals, exceptions, and economics.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {},
  side_effects: ['Computes closing readiness assessment'],
};

const execute: ToolExecutor = async (_params, context) => {
  const result = await computeClosingReadiness(context.entityId);

  return {
    success: true,
    result: {
      closing_readiness_id: result.id,
      readiness_state: result.readiness_state,
      overall_score: result.overall_score,
      document_score: result.document_score,
      financing_score: result.financing_score,
      title_score: result.title_score,
      checklist_score: result.checklist_score,
      approval_score: result.approval_score,
      unresolved_blockers: result.unresolved_blockers,
      missing_documents: result.missing_documents,
      pending_items: result.pending_items,
      target_closing_date: result.target_closing_date,
      days_until_closing: result.days_until_closing,
    },
    side_effects: [
      {
        type: 'closing_readiness_computed',
        description: `Closing readiness computed: ${result.overall_score}% (${result.readiness_state})`,
        target_id: result.id,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
