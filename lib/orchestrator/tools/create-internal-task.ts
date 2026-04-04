import { supabase } from '@/lib/db/client';
import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as assignmentRepo from '@/lib/repositories/transaction-assignments';
import { logAction } from '@/lib/audit/logger';

const contract: ToolContract = {
  name: 'create_internal_task',
  description: 'Create an internal task as a checklist item, optionally auto-assigning based on deal ownership.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: false,
  params_schema: {
    title: { type: 'string', required: true, description: 'Task title' },
    description: { type: 'string', required: false, description: 'Task description' },
    due_date: { type: 'string', required: false, description: 'Due date in ISO format' },
    auto_assign: { type: 'boolean', required: false, description: 'Auto-assign to deal owner (default: true)' },
    priority: { type: 'string', required: false, description: 'Priority: low, normal, high' },
  },
  side_effects: ['Creates checklist_item record'],
};

const execute: ToolExecutor = async (params, context) => {
  const title = params.title as string;
  const description = (params.description as string) ?? null;
  const dueDate = (params.due_date as string) ?? null;
  const autoAssign = (params.auto_assign as boolean) ?? true;
  const priority = (params.priority as string) || 'normal';

  // Look up the primary agent for auto-assignment
  let assignedToUserId: string | null = null;
  if (autoAssign) {
    const assignment = await assignmentRepo.findByTransactionId(context.entityId);
    assignedToUserId = assignment?.primary_agent_id ?? null;
  }

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      transaction_id: context.entityId,
      title,
      description,
      due_date: dueDate,
      status: 'pending',
      source: 'ai_generated',
      requires_review: false,
      completed_at: null,
      assigned_to_user_id: assignedToUserId,
      priority,
    })
    .select('*')
    .single();

  if (error) {
    return { success: false, result: { error: error.message }, side_effects: [] };
  }

  await logAction({
    organizationId: context.organizationId,
    transactionId: context.entityId,
    actorType: 'ai',
    action: 'checklist_item.created',
    targetType: 'checklist_item',
    targetId: data.id,
    metadata: {
      title,
      priority,
      auto_assigned: autoAssign,
      assigned_to: assignedToUserId,
      source: 'orchestrator_internal_task',
    },
  });

  return {
    success: true,
    result: {
      checklist_item_id: data.id,
      title: data.title,
      assigned_to_user_id: assignedToUserId,
      auto_assigned: autoAssign && assignedToUserId !== null,
      priority,
    },
    side_effects: [
      {
        type: 'checklist_item_created',
        description: `Internal task created: ${title}${assignedToUserId ? ' (auto-assigned to deal owner)' : ''}`,
        target_id: data.id,
      },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
