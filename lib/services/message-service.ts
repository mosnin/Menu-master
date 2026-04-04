import { supabase } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { logAction } from '@/lib/audit/logger';
import type { OutboundMessage, MessageStatus } from '@/types';

const TABLE = 'outbound_messages';

interface CreateMessageDraftParams {
  orgId: string;
  transactionId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

export async function createMessageDraft(
  params: CreateMessageDraftParams,
): Promise<OutboundMessage> {
  // Create outbound message with status='draft'
  const { data: message, error: messageError } = await supabase
    .from(TABLE)
    .insert({
      organization_id: params.orgId,
      transaction_id: params.transactionId,
      recipient_name: params.recipientName,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      body: params.body,
      status: 'draft' as MessageStatus,
      approval_id: null,
      send_after: null,
      sent_at: null,
    })
    .select('*')
    .single();

  if (messageError) {
    throw new Error(`Failed to create message draft: ${messageError.message}`);
  }

  // Create approval request for the outbound email
  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .insert({
      organization_id: params.orgId,
      transaction_id: params.transactionId,
      approval_type: 'outbound_email',
      status: 'pending',
      requested_by_user_id: message.id,
      decided_by_user_id: null,
      payload_json: {
        message_id: message.id,
        recipient_name: params.recipientName,
        recipient_email: params.recipientEmail,
        subject: params.subject,
      },
      decision_notes: null,
      decided_at: null,
    })
    .select('*')
    .single();

  if (approvalError) {
    console.error('Failed to create approval for message:', approvalError);
  }

  // Link approval to message and update status to pending_approval
  if (approval) {
    await supabase
      .from(TABLE)
      .update({
        approval_id: approval.id,
        status: 'pending_approval' as MessageStatus,
      })
      .eq('id', message.id);
  }

  await logAction({
    organizationId: params.orgId,
    transactionId: params.transactionId,
    actorType: 'system',
    action: 'message.drafted',
    targetType: 'outbound_message',
    targetId: message.id,
    metadata: {
      recipient_email: params.recipientEmail,
      subject: params.subject,
    },
  });

  return message as OutboundMessage;
}

export async function sendApprovedMessage(
  messageId: string,
): Promise<OutboundMessage> {
  // Fetch message
  const { data: message, error: fetchError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', messageId)
    .single();

  if (fetchError || !message) {
    throw new Error(
      `Message not found: ${fetchError?.message ?? 'No data returned'}`,
    );
  }

  // Check that an approval exists and is approved
  if (message.approval_id) {
    const { data: approval } = await supabase
      .from('approvals')
      .select('status')
      .eq('id', message.approval_id)
      .single();

    if (!approval || approval.status !== 'approved') {
      throw new Error('Message has not been approved');
    }
  }

  // Update status to sending
  await supabase
    .from(TABLE)
    .update({ status: 'sending' as MessageStatus })
    .eq('id', messageId);

  try {
    // Send via email service
    await sendEmail({
      to: message.recipient_email,
      subject: message.subject,
      html: message.body,
    });

    // Update status to sent
    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update({
        status: 'sent' as MessageStatus,
        sent_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(
        `Failed to update message status: ${updateError.message}`,
      );
    }

    await logAction({
      organizationId: message.organization_id,
      transactionId: message.transaction_id,
      actorType: 'system',
      action: 'message.sent',
      targetType: 'outbound_message',
      targetId: messageId,
      metadata: {
        recipient_email: message.recipient_email,
        subject: message.subject,
      },
    });

    return updated as OutboundMessage;
  } catch (error) {
    // Mark as failed
    await supabase
      .from(TABLE)
      .update({ status: 'failed' as MessageStatus })
      .eq('id', messageId);

    await logAction({
      organizationId: message.organization_id,
      transactionId: message.transaction_id,
      actorType: 'system',
      action: 'message.failed',
      targetType: 'outbound_message',
      targetId: messageId,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

export async function getMessagesByTransaction(
  transactionId: string,
): Promise<OutboundMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []) as OutboundMessage[];
}
