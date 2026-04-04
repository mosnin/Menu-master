'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { sendApprovedMessage } from '@/lib/services/message-service';
import { supabase } from '@/lib/db/client';

export async function sendApprovedMessageAction(messageId: string) {
  const session = await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Verify the message exists and check its approval status
  const { data: message, error } = await supabase
    .from('outbound_messages')
    .select('*, approvals:approval_id(status)')
    .eq('id', messageId)
    .single();

  if (error || !message) {
    throw new Error('Message not found');
  }

  // Verify org membership — prevent cross-org access
  await requireOrgMembership(message.organization_id);

  // Require an approved approval record — no sending without one
  const approval = message.approvals as { status: string } | null;
  if (!message.approval_id || !approval) {
    throw new Error('Message has no approval record');
  }
  if (approval.status === 'rejected' || approval.status === 'cancelled') {
    throw new Error(`Message approval has been ${approval.status}`);
  }
  if (approval.status !== 'approved') {
    throw new Error('Message has not been approved');
  }

  // Prevent double-send — only approved messages can be sent
  if (message.status === 'sent') {
    throw new Error('Message has already been sent');
  }
  if (message.status === 'sending') {
    throw new Error('Message is currently being sent');
  }
  if (message.status !== 'approved' && message.status !== 'pending_approval') {
    throw new Error(`Message cannot be sent from status "${message.status}"`);
  }

  const sentMessage = await sendApprovedMessage(messageId);

  revalidatePath(`/transactions/${message.transaction_id}`);
  revalidatePath(`/transactions/${message.transaction_id}/messages`);

  return sentMessage;
}
