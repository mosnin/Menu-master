import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { computeListingReadiness } from '@/lib/services/listing-readiness-service';

const contract: ToolContract = {
  name: 'recompute_listing_readiness',
  description: 'Recompute listing readiness score based on documents, checklists, and requirements.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {},
  side_effects: ['Updates listing readiness computation'],
};

const execute: ToolExecutor = async (_params, context) => {
  const result = await computeListingReadiness(context.entityId);

  return {
    success: true,
    result: {
      score: result.score,
      state: result.state,
      total_checklist: result.totalChecklist,
      completed_checklist: result.completedChecklist,
      required_checklist: result.requiredChecklist,
      completed_required: result.completedRequired,
      blocked_items: result.blockedItems,
      open_exceptions: result.openExceptions,
      critical_exceptions: result.criticalExceptions,
      pending_seller_docs: result.pendingSellerDocs,
      blockers: result.blockers,
    },
    side_effects: [
      {
        type: 'listing_readiness_updated',
        description: `Listing readiness recomputed: ${result.score}% (${result.state})`,
        target_id: context.entityId,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
