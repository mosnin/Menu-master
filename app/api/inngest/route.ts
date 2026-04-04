import { serve } from 'inngest/next';
import { inngest } from '@/lib/workflows/client';
import { documentProcessingFunction } from '@/lib/workflows/document-processing';
import { reminderProcessingFunction } from '@/lib/workflows/reminder-processing';
import { sendApprovedEmailFunction } from '@/lib/workflows/send-approved-email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    documentProcessingFunction,
    reminderProcessingFunction,
    sendApprovedEmailFunction,
  ],
});
