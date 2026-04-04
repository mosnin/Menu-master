import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { createNotification } from '@/lib/services/notification-service';

const contract: ToolContract = {
  name: 'create_notification',
  description: 'Create a notification for a user about a deal event or required action.',
  risk_class: 'safe',
  required_role: 'agent',
  idempotent: false,
  params_schema: {
    user_id: { type: 'string', required: true, description: 'Target user ID for the notification' },
    title: { type: 'string', required: true, description: 'Notification title' },
    message: { type: 'string', required: false, description: 'Notification body text' },
    category: { type: 'string', required: false, description: 'Notification category' },
    priority: { type: 'string', required: false, description: 'Notification priority (low, normal, high, urgent)' },
  },
  side_effects: ['Creates notification record'],
};

const execute: ToolExecutor = async (params, context) => {
  if (!params.message && !params.title) {
    return {
      success: false,
      result: { error: 'At least one of title or message must be provided' },
      side_effects: [],
    };
  }

  const userId = params.user_id as string;
  const title = params.title as string || params.message as string || 'Deal update';
  const body = params.message as string | undefined;
  const category = (params.category as string) || 'general';
  const priority = (params.priority as string) || 'normal';

  const notification = await createNotification({
    organizationId: context.organizationId,
    userId,
    category: category as 'general',
    title,
    body,
    entityType: context.entityType,
    entityId: context.entityId,
    transactionId: context.entityType === 'transaction' ? context.entityId : undefined,
    priority: priority as 'normal',
    dedupKey: `orchestrator:${context.orchestratorId}:${title}`,
    actorName: 'Deal Orchestrator',
    metadata: { source: 'orchestrator', orchestrator_id: context.orchestratorId },
  });

  return {
    success: true,
    result: {
      notification_id: notification?.id ?? null,
      skipped: notification === null,
    },
    side_effects: notification
      ? [{ type: 'notification_created', description: `Notification created: ${title}`, target_id: notification.id }]
      : [],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
