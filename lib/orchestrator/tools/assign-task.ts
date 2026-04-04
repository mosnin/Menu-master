import { supabase } from '@/lib/db/client';
import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { logAction } from '@/lib/audit/logger';

const contract: ToolContract = {
  name: 'assign_task',
  description: 'Assign a task to a user by creating a checklist item with an assignee.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    title: { type: 'string', required: true, description: 'Task title' },
    description: { type: 'string', required: false, description: 'Task description' },
    assigned_to_user_id: { type: 'string', required: true, description: 'User ID to assign the task to' },
    due_date: { type: 'string', required: false, description: 'Due date in ISO format' },
  },
  side_effects: ['Creates checklist_item record with assignee'],
};

const execute: ToolExecutor = async (params, context) => {
  const title = params.title as string;
  const assignedTo = params.assigned_to_user_id as string;

  if (!title || !assignedTo) {
    return {
      success: false,
      result: { error: 'Missing required parameters: title, assigned_to_user_id' },
      side_effects: [],
    };
  }

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      transaction_id: context.entityId,
      title,
      description: (params.description as string) ?? null,
      due_date: (params.due_date as string) ?? null,
      status: 'pending',
      source: 'ai_generated',
      requires_review: false,
      completed_at: null,
      assigned_to_user_id: assignedTo,
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
    metadata: { title, assigned_to_user_id: assignedTo, source: 'orchestrator' },
  });

  return {
    success: true,
    result: { checklist_item_id: data.id, title, assigned_to: assignedTo },
    side_effects: [
      { type: 'task_assigned', description: `Task assigned to ${assignedTo}: ${title}`, target_id: data.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
