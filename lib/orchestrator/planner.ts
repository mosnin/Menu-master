import { getOpenAIClient } from '@/lib/ai/client';
import type { WorldStateSnapshot, OrchestratorMemoryEntry, PlannerOutput } from '@/types';
import { getAllTools } from './tool-registry';

export async function runPlanner(
  worldState: WorldStateSnapshot,
  memory: OrchestratorMemoryEntry[],
  _entityContext: { entityType: string; entityId: string; orgId: string },
): Promise<PlannerOutput> {
  const client = getOpenAIClient();

  // Build available tools description
  const availableTools = getAllTools().map(t => ({
    name: t.contract.name,
    description: t.contract.description,
    risk_class: t.contract.risk_class,
    params: t.contract.params_schema,
  }));

  // Build memory summary
  const unresolvedBlockers = memory.filter(m => m.memory_type === 'blocker' && !m.resolved);
  const recentActions = memory.filter(m => m.memory_type === 'action_taken').slice(0, 5);
  const failurePatterns = memory.filter(m => m.memory_type === 'failure_pattern');
  const humanCorrections = memory.filter(m => m.memory_type === 'human_correction').slice(0, 3);
  const pendingDecisions = memory.filter(m => m.memory_type === 'pending_decision' && !m.resolved);

  const systemPrompt = `You are the Deal Desk Orchestrator Planner. You observe deal state and propose bounded actions.

RULES:
1. You can ONLY propose actions from the available tools list
2. Each action must have a clear reason tied to the current state
3. Prefer safe actions over risky ones
4. If prior recommendations were ignored, note this but don't repeat the same action
5. If there are unresolved blockers, prioritize those
6. Never propose actions that bypass approvals or compliance
7. Be concise — this is an operations system, not a conversation
8. Output valid JSON only

AVAILABLE TOOLS:
${JSON.stringify(availableTools, null, 2)}`;

  const userMessage = `WORLD STATE:
${JSON.stringify(worldState, null, 2)}

UNRESOLVED BLOCKERS: ${unresolvedBlockers.map(b => b.summary).join('; ') || 'None'}
RECENT ACTIONS: ${recentActions.map(a => a.summary).join('; ') || 'None'}
FAILURE PATTERNS: ${failurePatterns.map(f => f.summary).join('; ') || 'None'}
HUMAN CORRECTIONS: ${humanCorrections.map(c => c.summary).join('; ') || 'None'}
PENDING DECISIONS: ${pendingDecisions.map(d => d.summary).join('; ') || 'None'}

Analyze this state and produce a JSON plan with this exact structure:
{
  "reasoning_summary": "brief analysis of current state",
  "world_state_assessment": "one sentence assessment",
  "blockers_identified": ["list of blockers"],
  "urgency_assessment": "low|normal|high|critical",
  "primary_recommendation": "one sentence primary action",
  "proposed_actions": [
    {
      "tool_name": "tool name from available tools",
      "params": {},
      "risk_class": "safe|medium_risk|high_risk",
      "confidence": 0.0-1.0,
      "reason": "why this action",
      "prerequisites": []
    }
  ]
}`;

  if (!client) {
    return createMockPlannerOutput(worldState);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty planner response');

    const parsed = JSON.parse(content) as PlannerOutput;
    return parsed;
  } catch {
    return createMockPlannerOutput(worldState);
  }
}

function createMockPlannerOutput(worldState: WorldStateSnapshot): PlannerOutput {
  const actions: PlannerOutput['proposed_actions'] = [];

  if (worldState.completeness_score < 50) {
    actions.push({
      tool_name: 'recompute_completeness',
      params: {},
      risk_class: 'safe',
      confidence: 0.95,
      reason: 'Completeness score is low, recompute to check current state',
      prerequisites: [],
    });
  }

  if (worldState.missing_docs.length > 0) {
    actions.push({
      tool_name: 'create_document_request',
      params: { document_types: worldState.missing_docs },
      risk_class: 'medium_risk',
      confidence: 0.85,
      reason: `Missing documents: ${worldState.missing_docs.join(', ')}`,
      prerequisites: [],
    });
  }

  if (worldState.unresolved_exceptions > 0) {
    actions.push({
      tool_name: 'recompute_exceptions',
      params: {},
      risk_class: 'safe',
      confidence: 0.9,
      reason: `${worldState.unresolved_exceptions} unresolved exceptions need attention`,
      prerequisites: [],
    });
  }

  if (worldState.pending_approvals > 0) {
    actions.push({
      tool_name: 'create_notification',
      params: { message: `${worldState.pending_approvals} approval(s) pending review` },
      risk_class: 'safe',
      confidence: 0.8,
      reason: 'Notify about pending approvals',
      prerequisites: [],
    });
  }

  if (worldState.overdue_obligations > 0) {
    actions.push({
      tool_name: 'create_reminder_draft',
      params: { reason: 'Overdue obligations need follow-up' },
      risk_class: 'medium_risk',
      confidence: 0.75,
      reason: `${worldState.overdue_obligations} obligation(s) are overdue`,
      prerequisites: [],
    });
  }

  return {
    reasoning_summary: `Deal is at ${worldState.stage} stage with ${worldState.completeness_score}% completeness. ${worldState.unresolved_exceptions} exceptions, ${worldState.missing_docs.length} missing docs.`,
    world_state_assessment: worldState.completeness_score >= 70 ? 'Deal is progressing well' : 'Deal needs attention',
    blockers_identified: [
      ...worldState.missing_docs.map(d => `Missing document: ${d}`),
      ...(worldState.unresolved_exceptions > 0 ? [`${worldState.unresolved_exceptions} unresolved exceptions`] : []),
    ],
    urgency_assessment: worldState.urgent_deadlines.length > 0 ? 'high' : worldState.completeness_score < 40 ? 'high' : 'normal',
    primary_recommendation: actions[0]?.reason ?? 'No immediate action required',
    proposed_actions: actions,
  };
}
