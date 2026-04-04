import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as nextActionRepo from '@/lib/repositories/orchestrator-next-actions';
import type { NextActionUrgency, ActionRiskClass } from '@/types';

const contract: ToolContract = {
  name: 'create_next_action_card',
  description: 'Create or update the next action card for the deal, indicating what should happen next.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {
    title: { type: 'string', required: true, description: 'Action title' },
    reason: { type: 'string', required: true, description: 'Why this is the next action' },
    urgency: { type: 'string', required: false, description: 'Urgency: low, normal, high, critical' },
    owner_user_id: { type: 'string', required: false, description: 'Who should take this action' },
    owner_role: { type: 'string', required: false, description: 'Role that should take this action' },
    is_primary: { type: 'boolean', required: false, description: 'Whether this is the primary next action' },
  },
  side_effects: ['Creates or updates orchestrator_next_action record'],
};

const VALID_RISK_CLASSES: readonly ActionRiskClass[] = ['safe', 'medium_risk', 'high_risk'];

const execute: ToolExecutor = async (params, context) => {
  const title = params.title as string;
  const reason = params.reason as string;
  const urgency = (params.urgency as NextActionUrgency) || 'normal';
  const isPrimary = (params.is_primary as boolean) ?? true;

  const rawRiskClass = params.risk_class as ActionRiskClass | undefined;
  const riskClass: ActionRiskClass = rawRiskClass && VALID_RISK_CLASSES.includes(rawRiskClass)
    ? rawRiskClass
    : 'safe';

  // Auto-deduplication: check if an active action with the same title already exists
  const activeActions = await nextActionRepo.findActive(context.orchestratorId);
  const existing = activeActions.find(a => a.title === title);

  if (existing) {
    // Update the existing action instead of creating a duplicate
    const updated = await nextActionRepo.update(existing.id, {
      reason,
      urgency,
      risk_class: riskClass,
      owner_user_id: (params.owner_user_id as string) ?? existing.owner_user_id,
      owner_role: (params.owner_role as string) ?? existing.owner_role,
      is_primary: isPrimary,
      stale_after: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    return {
      success: true,
      result: { next_action_id: updated.id, title, urgency, deduplicated: true },
      side_effects: [
        { type: 'next_action_updated', description: `Next action updated (dedup): ${title}`, target_id: updated.id },
      ],
    };
  }

  const nextAction = await nextActionRepo.create({
    orchestrator_id: context.orchestratorId,
    title,
    reason,
    urgency,
    risk_class: riskClass,
    owner_user_id: (params.owner_user_id as string) ?? null,
    owner_role: (params.owner_role as string) ?? null,
    prerequisites: [],
    source_signals: [{ type: 'orchestrator', detail: reason }],
    auto_executable: false,
    tool_name: null,
    tool_params: null,
    is_primary: isPrimary,
    status: 'active',
    stale_after: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    cycle_id: null,
  });

  return {
    success: true,
    result: { next_action_id: nextAction.id, title, urgency, deduplicated: false },
    side_effects: [
      { type: 'next_action_created', description: `Next action: ${title}`, target_id: nextAction.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
