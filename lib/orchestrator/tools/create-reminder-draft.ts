import { registerTool } from '../tool-registry';
import type { ToolContract, ToolExecutor } from '../tool-registry';
import { scheduleReminder } from '@/lib/services/reminder-service';

const contract: ToolContract = {
  name: 'create_reminder_draft',
  description: 'Schedule a reminder for a deadline or follow-up action on a transaction.',
  risk_class: 'medium_risk',
  required_role: 'coordinator',
  idempotent: false,
  params_schema: {
    reminder_type: { type: 'string', required: false, description: 'Type: deadline_approaching, overdue, action_required, follow_up' },
    scheduled_for: { type: 'string', required: false, description: 'ISO datetime to send the reminder' },
    reason: { type: 'string', required: false, description: 'Reason for the reminder' },
    checklist_item_id: { type: 'string', required: false, description: 'Related checklist item ID' },
    timeline_event_id: { type: 'string', required: false, description: 'Related timeline event ID' },
  },
  side_effects: ['Creates reminder record'],
};

const execute: ToolExecutor = async (params, context) => {
  const reminderType = (params.reminder_type as string) || 'follow_up';
  // Default scheduling: 24 hours from now.
  // This gives a reasonable follow-up window for most transaction-related reminders
  // (e.g., document submissions, signature requests) without being so far out that
  // urgent items are missed. Callers can override via the `scheduled_for` param
  // with an ISO 8601 datetime string.
  const scheduledFor = (params.scheduled_for as string) || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const reminder = await scheduleReminder({
    organizationId: context.organizationId,
    transactionId: context.entityId,
    checklistItemId: params.checklist_item_id as string | undefined,
    timelineEventId: params.timeline_event_id as string | undefined,
    reminderType: reminderType as 'follow_up',
    scheduledFor,
  });

  return {
    success: true,
    result: { reminder_id: reminder.id, scheduled_for: reminder.scheduled_for, reminder_type: reminder.reminder_type },
    side_effects: [
      { type: 'reminder_scheduled', description: `Reminder scheduled for ${scheduledFor}`, target_id: reminder.id },
    ],
  };
};

export function register(): void {
  registerTool(contract, execute);
}
