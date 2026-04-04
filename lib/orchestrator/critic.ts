import { getOpenAIClient } from '@/lib/ai/client';
import type {
  WorldStateSnapshot,
  PlannerOutput,
  CriticEvaluation,
  ActionRiskClass,
  LearningContext,
} from '@/types';
import { getToolContract, isToolAllowed } from './tool-registry';

// ---------------------------------------------------------------------------
// Deterministic rules that always apply regardless of AI
// ---------------------------------------------------------------------------

interface DeterministicReview {
  approved: boolean;
  concerns: string[];
  compliance_flags: string[];
  requires_human_review: boolean;
  suggested_risk_class: ActionRiskClass | null;
}

function applyDeterministicRules(
  action: PlannerOutput['proposed_actions'][number],
  worldState: WorldStateSnapshot,
): DeterministicReview {
  const concerns: string[] = [];
  const complianceFlags: string[] = [];
  let requiresHumanReview = false;
  let approved = true;
  let suggestedRiskClass: ActionRiskClass | null = null;

  const contract = getToolContract(action.tool_name);

  // Rule 1: high_risk actions ALWAYS require human review
  if (action.risk_class === 'high_risk') {
    requiresHumanReview = true;
    concerns.push('High-risk action requires human review before execution');
  }

  // Rule 2: medium_risk actions with confidence < 0.7 require human review
  if (action.risk_class === 'medium_risk' && action.confidence < 0.7) {
    requiresHumanReview = true;
    concerns.push(`Medium-risk action with low confidence (${action.confidence}) requires human review`);
  }

  // Rule 3: Actions on closed/cancelled transactions are rejected
  if (worldState.stage === 'closed' || worldState.stage === 'cancelled') {
    approved = false;
    concerns.push(`Cannot execute actions on ${worldState.stage} deals`);
  }

  // Rule 4: Stage transitions with missing docs are flagged
  if (action.tool_name === 'suggest_stage_transition' && worldState.missing_docs.length > 0) {
    requiresHumanReview = true;
    complianceFlags.push(
      `Stage transition proposed while ${worldState.missing_docs.length} document(s) are missing: ${worldState.missing_docs.join(', ')}`,
    );
  }

  // Rule 5: Verify the tool's actual risk class matches what the planner claimed
  if (contract && contract.risk_class !== action.risk_class) {
    suggestedRiskClass = contract.risk_class;
    concerns.push(
      `Planner claimed risk_class "${action.risk_class}" but tool is registered as "${contract.risk_class}"`,
    );
  }

  // Rule 6: Compliance flags in world state should block risky actions
  if (worldState.compliance_flags.length > 0 && action.risk_class !== 'safe') {
    complianceFlags.push(
      `Active compliance flags: ${worldState.compliance_flags.join(', ')}`,
    );
    requiresHumanReview = true;
  }

  // Rule 7: Unknown tool names are rejected
  if (!contract) {
    approved = false;
    concerns.push(`Unknown tool: ${action.tool_name}`);
  }

  // Rule 8: Reject tools that require a higher role than the acting user's role.
  // The worldState.ownership.owner_role carries the current user's role; fall
  // back to 'agent' (lowest privilege) when it is unavailable.
  if (contract) {
    const actingRole = (worldState.ownership?.owner_role as import('@/types').UserRole) ?? 'agent';
    if (!isToolAllowed(action.tool_name, actingRole)) {
      approved = false;
      concerns.push(
        `Tool "${action.tool_name}" requires role "${contract.required_role}" but acting user role is "${actingRole}"`,
      );
    }
  }

  return {
    approved,
    concerns,
    compliance_flags: complianceFlags,
    requires_human_review: requiresHumanReview,
    suggested_risk_class: suggestedRiskClass,
  };
}

// ---------------------------------------------------------------------------
// AI-powered critic
// ---------------------------------------------------------------------------

export async function runCritic(
  plannerOutput: PlannerOutput,
  worldState: WorldStateSnapshot,
  learningContext?: LearningContext,
): Promise<CriticEvaluation> {
  // First, apply deterministic rules to all actions
  const deterministicReviews = plannerOutput.proposed_actions.map(action =>
    applyDeterministicRules(action, worldState),
  );

  // Check if any deterministic rules have already rejected or flagged everything
  const allDeterministicRejected = deterministicReviews.every(r => !r.approved);
  const hasHighRiskFlags = deterministicReviews.some(
    r => r.requires_human_review || r.compliance_flags.length > 0,
  );

  // Build deterministic-only evaluation
  const deterministicActionReviews = plannerOutput.proposed_actions.map((action, i) => {
    const det = deterministicReviews[i];
    return {
      tool_name: action.tool_name,
      approved: det.approved,
      risk_class_appropriate: det.suggested_risk_class === null,
      confidence_assessment: action.confidence,
      concerns: det.concerns,
      compliance_flags: det.compliance_flags,
      requires_human_review: det.requires_human_review,
      suggested_risk_class: det.suggested_risk_class,
    };
  });

  const allContradictions: string[] = [];
  const allComplianceConcerns: string[] = [];

  // Gather deterministic compliance concerns
  for (const review of deterministicReviews) {
    allComplianceConcerns.push(...review.compliance_flags);
  }

  // Learning-influenced rules (can add concerns and flag review, but NOT override safety rules)
  if (learningContext) {
    for (let i = 0; i < plannerOutput.proposed_actions.length; i++) {
      const action = plannerOutput.proposed_actions[i];
      const review = deterministicActionReviews[i];

      // Rule L1: Correction patterns suggest manual review for this action type
      const matchingCorrections = learningContext.correctionPatterns.filter(
        p => p.suggested_action === 'request_manual_review' && p.occurrence_count >= 3,
      );
      if (matchingCorrections.length > 0) {
        review.requires_human_review = true;
        review.concerns.push(
          `Learning: correction patterns suggest manual review (${matchingCorrections.map(c => c.detail).join('; ')})`,
        );
      }

      // Rule L2: Org profile says strict manual review
      if (learningContext.orgProfile?.strict_manual_review && action.risk_class !== 'safe') {
        review.requires_human_review = true;
        review.concerns.push('Learning: organization prefers strict manual review for non-safe actions');
      }

      // Rule L3: High compliance sensitivity org + any compliance concern
      if (
        learningContext.orgProfile?.compliance_sensitivity === 'high' &&
        worldState.compliance_flags.length > 0
      ) {
        review.requires_human_review = true;
        review.compliance_flags.push('Learning: high compliance sensitivity org with active compliance flags');
      }

      // Rule L4: Low effectiveness score — add concern (does NOT reject, just flags)
      const actionScore = learningContext.actionScores.find(s => s.tool_name === action.tool_name);
      if (actionScore && actionScore.effectiveness_score < 0.3 && actionScore.total_executions >= 5) {
        review.concerns.push(
          `Learning: "${action.tool_name}" has low historical effectiveness (${(actionScore.effectiveness_score * 100).toFixed(0)}% over ${actionScore.total_executions} executions)`,
        );
      }

      // Rule L5: Frequently ignored action — add concern
      const ignoredAction = learningContext.ignoredActions.find(a => a.tool_name === action.tool_name);
      if (ignoredAction && ignoredAction.ignore_count >= 5) {
        review.concerns.push(
          `Learning: "${action.tool_name}" has been ignored ${ignoredAction.ignore_count} times by humans`,
        );
      }
    }
  }

  // Try AI-powered review for additional insight
  const client = getOpenAIClient();
  if (client && !allDeterministicRejected) {
    try {
      const aiEvaluation = await runAICritic(client, plannerOutput, worldState);

      // Merge AI insights with deterministic results
      for (let i = 0; i < deterministicActionReviews.length; i++) {
        const aiReview = aiEvaluation.action_reviews.find(
          r => r.tool_name === deterministicActionReviews[i].tool_name,
        );
        if (aiReview) {
          // Deterministic rules always win for approval/rejection
          // AI can only add concerns, not override rejections
          if (!deterministicActionReviews[i].approved) {
            // Keep deterministic rejection
          } else {
            deterministicActionReviews[i].approved = aiReview.approved;
          }
          deterministicActionReviews[i].concerns.push(
            ...aiReview.concerns.filter(c => !deterministicActionReviews[i].concerns.includes(c)),
          );
          deterministicActionReviews[i].compliance_flags.push(
            ...aiReview.compliance_flags.filter(f => !deterministicActionReviews[i].compliance_flags.includes(f)),
          );
          // AI can flag human review but not un-flag it
          if (aiReview.requires_human_review) {
            deterministicActionReviews[i].requires_human_review = true;
          }
          deterministicActionReviews[i].confidence_assessment = aiReview.confidence_assessment;
        }
      }

      allContradictions.push(...aiEvaluation.contradictions_detected);
      allComplianceConcerns.push(
        ...aiEvaluation.compliance_concerns.filter(c => !allComplianceConcerns.includes(c)),
      );
    } catch {
      // AI critic failed, proceed with deterministic results only
    }
  }

  const overallApproval = deterministicActionReviews.some(r => r.approved);
  const escalationNeeded = hasHighRiskFlags || allContradictions.length > 0;

  return {
    overall_approval: overallApproval,
    reasoning_summary: overallApproval
      ? `Reviewed ${deterministicActionReviews.length} proposed actions. ${deterministicActionReviews.filter(r => r.approved).length} approved.`
      : 'All proposed actions were rejected by policy rules.',
    action_reviews: deterministicActionReviews,
    contradictions_detected: allContradictions,
    compliance_concerns: [...new Set(allComplianceConcerns)],
    escalation_needed: escalationNeeded,
    escalation_reason: escalationNeeded
      ? `${allContradictions.length} contradictions, ${allComplianceConcerns.length} compliance concerns`
      : null,
  };
}

// ---------------------------------------------------------------------------
// AI critic helper
// ---------------------------------------------------------------------------

async function runAICritic(
  client: NonNullable<ReturnType<typeof getOpenAIClient>>,
  plannerOutput: PlannerOutput,
  worldState: WorldStateSnapshot,
): Promise<CriticEvaluation> {
  const systemPrompt = `You are the Deal Desk Orchestrator Critic. You review proposed actions for safety, correctness, and compliance.

RULES:
1. Verify each proposed action makes sense given the current state
2. Check for contradictions (e.g., requesting docs that already exist)
3. Flag compliance risks
4. Assess confidence levels — lower them if the rationale is weak
5. Output valid JSON only

Respond with this exact structure:
{
  "overall_approval": boolean,
  "reasoning_summary": "string",
  "action_reviews": [{
    "tool_name": "string",
    "approved": boolean,
    "risk_class_appropriate": boolean,
    "confidence_assessment": number,
    "concerns": ["string"],
    "compliance_flags": ["string"],
    "requires_human_review": boolean,
    "suggested_risk_class": "safe|medium_risk|high_risk" or null
  }],
  "contradictions_detected": ["string"],
  "compliance_concerns": ["string"],
  "escalation_needed": boolean,
  "escalation_reason": "string" or null
}`;

  const userMessage = `PROPOSED PLAN:
${JSON.stringify(plannerOutput, null, 2)}

CURRENT WORLD STATE:
${JSON.stringify(worldState, null, 2)}

Review this plan and provide your evaluation.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty critic response');

  return JSON.parse(content) as CriticEvaluation;
}
