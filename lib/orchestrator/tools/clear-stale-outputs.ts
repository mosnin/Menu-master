import { supabase } from '@/lib/db/client';
import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import * as nextActionRepo from '@/lib/repositories/orchestrator-next-actions';

const contract: ToolContract = {
  name: 'clear_stale_outputs',
  description: 'Clear stale or superseded orchestrator outputs like old next actions and outdated notifications.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: true,
  params_schema: {
    target_type: { type: 'string', required: false, description: 'Type of output to clear: next_actions, notifications, or all' },
    older_than_hours: { type: 'number', required: false, description: 'Clear outputs older than this many hours (default: 48)' },
  },
  side_effects: ['Marks stale next_actions as stale', 'May archive old notifications'],
};

const execute: ToolExecutor = async (params, context) => {
  const targetType = (params.target_type as string) || 'all';
  const olderThanHours = (params.older_than_hours as number) || 48;
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

  const sideEffects: { type: string; description: string; target_id?: string }[] = [];
  let staleActionsCount = 0;
  let archivedNotificationsCount = 0;

  // Clear stale next actions
  if (targetType === 'next_actions' || targetType === 'all') {
    const activeActions = await nextActionRepo.findActive(context.orchestratorId);
    const staleActions = activeActions.filter(a => a.created_at < cutoff);

    for (const action of staleActions) {
      await nextActionRepo.update(action.id, { status: 'stale' });
      staleActionsCount++;
    }

    if (staleActionsCount > 0) {
      sideEffects.push({
        type: 'next_actions_cleared',
        description: `Marked ${staleActionsCount} next action(s) as stale (older than ${olderThanHours}h)`,
      });
    }
  }

  // Archive old notifications
  if (targetType === 'notifications' || targetType === 'all') {
    const { data: oldNotifications, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('entity_id', context.entityId)
      .eq('entity_type', context.entityType)
      .lt('created_at', cutoff)
      .eq('archived', false)
      .limit(100);

    if (!error && oldNotifications && oldNotifications.length > 0) {
      const ids = oldNotifications.map((n: { id: string }) => n.id);
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (!updateError) {
        archivedNotificationsCount = ids.length;
        sideEffects.push({
          type: 'notifications_archived',
          description: `Archived ${archivedNotificationsCount} notification(s) older than ${olderThanHours}h`,
        });
      }
    }
  }

  return {
    success: true,
    result: {
      stale_actions_cleared: staleActionsCount,
      notifications_archived: archivedNotificationsCount,
      cutoff_timestamp: cutoff,
      target_type: targetType,
    },
    side_effects: sideEffects,
  };
};

export function register(): void {
  registerTool(contract, execute);
}
