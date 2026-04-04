import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { computeHealthScore } from '@/lib/services/health-score-service';

const contract: ToolContract = {
  name: 'recompute_health_score',
  description: 'Recompute the deal health score for a transaction including completeness, timeliness, responsiveness, compliance, and financing factors.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {},
  side_effects: ['Updates deal_health_scores record'],
};

const execute: ToolExecutor = async (_params, context) => {
  const score = await computeHealthScore(context.entityId, context.organizationId);
  return {
    success: true,
    result: {
      overall_score: score.overall_score,
      rating: score.rating,
      score_trend: score.score_trend,
      risk_factors: score.risk_factors,
    },
    side_effects: [
      {
        type: 'health_score_updated',
        description: `Health score recomputed: ${score.overall_score} (${score.rating})`,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
