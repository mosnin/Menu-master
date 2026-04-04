'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/session';
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

  // Check the approval is approved
  const approval = message.approvals as { status: string } | null;
  if (message.approval_id && (!approval || approval.status !== 'approved')) {
    throw new Error('Message has not been approved');
  }

  const sentMessage = await sendApprovedMessage(messageId);

  revalidatePath(`/transactions/${message.transaction_id}`);
  revalidatePath(`/transactions/${message.transaction_id}/messages`);

  return sentMessage;
}
