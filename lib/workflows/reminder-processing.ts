import { inngest } from './client';
import { logger } from '@/lib/logger';
import * as reminderService from '@/lib/services/reminder-service';

export const reminderProcessingFunction = inngest.createFunction(
  { id: 'reminder-processing', name: 'Daily Reminder Processing' },
  { cron: '0 8 * * *' },
  async ({ step }) => {
    // The reminder service's processReminders function handles the full
    // pipeline: finding due reminders, drafting emails via AI, creating
    // approval requests, and updating reminder statuses.
    const result = await step.run('process-all-reminders', async () => {
      return reminderService.processReminders();
    });

    if (result.errors.length > 0) {
      logger.error('Reminder processing errors', { errors: result.errors });
    }

    return {
      processed: result.processed,
      errors: result.errors.length,
    };
  },
);
