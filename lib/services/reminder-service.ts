import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import { draftReminderEmail } from '@/lib/ai/email-drafter';
import { createApproval } from './approval-service';
import type { Reminder, ReminderStatus } from '@/types';

interface ScheduleReminderParams {
  organizationId: string;
  transactionId: string;
  checklistItemId?: string;
  timelineEventId?: string;
  reminderType:
    | 'deadline_approaching'
    | 'overdue'
    | 'action_required'
    | 'follow_up';
  scheduledFor: string;
}

export async function scheduleReminder(
  params: ScheduleReminderParams,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      organization_id: params.organizationId,
      transaction_id: params.transactionId,
      checklist_item_id: params.checklistItemId ?? null,
      timeline_event_id: params.timelineEventId ?? null,
      reminder_type: params.reminderType,
      scheduled_for: params.scheduledFor,
      status: 'pending' as ReminderStatus,
      outbound_message_id: null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to schedule reminder: ${error.message}`);
  }

  await logAction({
    organizationId: params.organizationId,
    transactionId: params.transactionId,
    actorType: 'system',
    action: 'reminder.scheduled',
    targetType: 'reminder',
    targetId: data.id,
    metadata: {
      reminder_type: params.reminderType,
      scheduled_for: params.scheduledFor,
    },
  });

  return data as Reminder;
}

export async function processReminders(): Promise<{
  processed: number;
  errors: string[];
}> {
  const now = new Date().toISOString();

  // Find all due reminders
  const { data: dueReminders, error: fetchError } = await supabase
    .from('reminders')
    .select('*, transactions(title, organization_id)')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch due reminders: ${fetchError.message}`);
  }

  const reminders = dueReminders ?? [];
  let processed = 0;
  const errors: string[] = [];

  for (const reminder of reminders) {
    try {
      const transaction = reminder.transactions as {
        title: string;
        organization_id: string;
      } | null;
      const transactionTitle = transaction?.title ?? 'Unknown Transaction';

      // Determine deadline info from related checklist item or timeline event
      let deadlineTitle = 'Upcoming deadline';
      let deadlineDate = reminder.scheduled_for;
      const recipientName = 'Team Member';

      if (reminder.checklist_item_id) {
        const { data: item } = await supabase
          .from('checklist_items')
          .select('title, due_date')
          .eq('id', reminder.checklist_item_id)
          .single();

        if (item) {
          deadlineTitle = item.title;
          deadlineDate = item.due_date ?? reminder.scheduled_for;
        }
      }

      if (reminder.timeline_event_id) {
        const { data: event } = await supabase
          .from('timeline_events')
          .select('title, event_date')
          .eq('id', reminder.timeline_event_id)
          .single();

        if (event) {
          deadlineTitle = event.title;
          deadlineDate = event.event_date ?? reminder.scheduled_for;
        }
      }

      // Draft an email using AI
      const emailDraft = await draftReminderEmail({
        recipientName,
        transactionTitle,
        deadlineTitle,
        deadlineDate,
      });

      // Create approval for the reminder email
      await createApproval({
        orgId: reminder.organization_id,
        transactionId: reminder.transaction_id,
        approvalType: 'outbound_email',
        requestedByUserId: reminder.id,
        payload: {
          reminder_id: reminder.id,
          email_draft: emailDraft,
          deadline_title: deadlineTitle,
          deadline_date: deadlineDate,
        },
      });

      // Update reminder status to sent
      await supabase
        .from('reminders')
        .update({ status: 'sent' as ReminderStatus })
        .eq('id', reminder.id);

      await logAction({
        organizationId: reminder.organization_id,
        transactionId: reminder.transaction_id,
        actorType: 'system',
        action: 'reminder.sent',
        targetType: 'reminder',
        targetId: reminder.id,
      });

      processed++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Reminder ${reminder.id}: ${message}`);
    }
  }

  return { processed, errors };
}

export async function getUpcomingReminders(
  orgId: string,
  days: number,
): Promise<Reminder[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .gte('scheduled_for', now.toISOString())
    .lte('scheduled_for', future.toISOString())
    .order('scheduled_for', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming reminders: ${error.message}`);
  }

  return (data ?? []) as Reminder[];
}
