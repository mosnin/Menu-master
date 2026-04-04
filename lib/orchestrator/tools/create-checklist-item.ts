import { supabase } from '@/lib/db/client';
import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { logAction } from '@/lib/audit/logger';

const contract: ToolContract = {
  name: 'create_checklist_item',
  description: 'Create a new checklist item on a transaction.',
  risk_class: 'safe',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    title: { type: 'string', required: true, description: 'Checklist item title' },
    description: { type: 'string', required: false, description: 'Checklist item description' },
    due_date: { type: 'string', required: false, description: 'Due date in ISO format' },
    assigned_to_user_id: { type: 'string', required: false, description: 'User to assign the item to' },
  },
  side_effects: ['Creates checklist_item record'],
};

const execute: ToolExecutor = async (params, context) => {
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      transaction_id: context.entityId,
      title: params.title as string,
      description: (params.description as string) ?? null,
      due_date: (params.due_date as string) ?? null,
      status: 'pending',
      source: 'ai_generated',
      requires_review: true,
      completed_at: null,
      assigned_to_user_id: (params.assigned_to_user_id as string) ?? null,
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
    metadata: { title: params.title, source: 'orchestrator' },
  });

  return {
    success: true,
    result: { checklist_item_id: data.id, title: data.title },
    side_effects: [
      { type: 'checklist_item_created', description: `Checklist item created: ${data.title}`, target_id: data.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
