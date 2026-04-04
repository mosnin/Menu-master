import { inngest } from './client';
import { supabase } from '@/lib/db/client';
import * as approvalRepo from '@/lib/repositories/approvals';
import { sendApprovedMessage } from '@/lib/services/message-service';
import { logAction } from '@/lib/audit/logger';
import type { OutboundMessage } from '@/types';

export const sendApprovedEmailFunction = inngest.createFunction(
  { id: 'send-approved-email', name: 'Send Approved Email' },
  { event: 'approval/decided' },
  async ({ event, step }) => {
    const { approvalId } = event.data as { approvalId: string };

    // Step 1: Check the approval status
    const approval = await step.run('check-approval', async () => {
      const a = await approvalRepo.findById(approvalId);
      if (!a) throw new Error(`Approval ${approvalId} not found`);
      if (a.status !== 'approved') {
        return null;
      }
      if (a.approval_type !== 'outbound_email') {
        return null;
      }
      return a;
    });

    if (!approval) {
      return { status: 'skipped', reason: 'Not an approved outbound email' };
    }

    // Step 2: Send the email via the message service
    const messageId = await step.run('send-email', async () => {
      const payload = approval.payload_json as Record<string, unknown> | null;
      const msgId = payload?.message_id as string | undefined;

      if (!msgId) {
        throw new Error('No message_id in approval payload');
      }

      // sendApprovedMessage handles fetching, validating approval, sending, and updating status
      await sendApprovedMessage(msgId);

      return msgId;
    });

    // Step 3: Verify message status is updated
    await step.run('update-status', async () => {
      const { data: message } = await supabase
        .from('outbound_messages')
        .select('status')
        .eq('id', messageId)
        .single();

      if (message && message.status !== 'sent') {
        await supabase
          .from('outbound_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', messageId);
      }
    });

    // Step 4: Log the send
    await step.run('audit-log', async () => {
      const { data: message } = await supabase
        .from('outbound_messages')
        .select('recipient_email, subject')
        .eq('id', messageId)
        .single();

      await logAction({
        organizationId: approval.organization_id,
        transactionId: approval.transaction_id,
        actorType: 'system',
        action: 'message.sent',
        targetType: 'outbound_message',
        targetId: messageId,
        metadata: {
          approvalId,
          recipientEmail: message?.recipient_email,
          subject: message?.subject,
        },
      });
    });

    return { status: 'sent', messageId, approvalId };
  },
);
