import { supabase } from '@/lib/db/client';
import * as threadRepo from '@/lib/repositories/communication-threads';
import * as messageRepo from '@/lib/repositories/communication-messages';
import * as emailConnRepo from '@/lib/repositories/email-account-connections';
import { logAction } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';
import type {
  CommunicationThread,
  CommunicationMessage,
  CommunicationProvider,
  MessageDirection,
  EmailAccountConnection,
} from '@/types';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface CreateThreadParams {
  orgId: string;
  transactionId?: string;
  provider: CommunicationProvider;
  externalThreadId?: string;
  subject: string;
}

interface AddMessageParams {
  threadId: string;
  direction: MessageDirection;
  fromAddress: string;
  toAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  externalMessageId?: string;
  ccAddresses?: string[];
  hasAttachments?: boolean;
  attachmentCount?: number;
}

interface ConnectEmailAccountParams {
  orgId: string;
  userId: string;
  provider: CommunicationProvider;
  email: string;
  credentials: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string;
  };
}

export interface ThreadWithMessageCount extends CommunicationThread {
  message_count: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a new communication thread linked (optionally) to a transaction.
 */
export async function createThread(
  params: CreateThreadParams,
): Promise<CommunicationThread> {
  const thread = await threadRepo.create({
    organization_id: params.orgId,
    transaction_id: params.transactionId ?? null,
    provider: params.provider,
    external_thread_id: params.externalThreadId ?? '',
    subject: params.subject,
    last_message_at: new Date().toISOString(),
    participant_emails: [],
    is_linked: !!params.transactionId,
    linked_by: params.transactionId ? 'manual' : null,
    link_confidence: null,
  });

  // Audit: communication_thread.created
  await logAction({
    organizationId: params.orgId,
    transactionId: params.transactionId,
    actorType: 'system',
    action: 'communication_thread.created',
    targetType: 'communication_thread',
    targetId: thread.id,
    metadata: {
      provider: params.provider,
      subject: params.subject,
    },
  });

  return thread;
}

/**
 * Adds a message to an existing thread and updates the thread's
 * last_message_at timestamp and participant list.
 */
export async function addMessage(
  params: AddMessageParams,
): Promise<CommunicationMessage> {
  const message = await messageRepo.create({
    thread_id: params.threadId,
    external_message_id: params.externalMessageId ?? '',
    direction: params.direction,
    from_email: params.fromAddress,
    to_emails: params.toAddresses,
    cc_emails: params.ccAddresses ?? [],
    subject: params.subject,
    body_text: params.bodyText,
    body_html: params.bodyHtml ?? null,
    sent_at: new Date().toISOString(),
    has_attachments: params.hasAttachments ?? false,
    attachment_count: params.attachmentCount ?? 0,
  });

  // Update thread's last_message_at and participant_emails
  const allEmails = [params.fromAddress, ...params.toAddresses, ...(params.ccAddresses ?? [])];
  const { data: thread } = await supabase
    .from('communication_threads')
    .select('participant_emails, organization_id, transaction_id')
    .eq('id', params.threadId)
    .single();

  if (thread) {
    const existingEmails: string[] = thread.participant_emails ?? [];
    const mergedEmails = Array.from(new Set([...existingEmails, ...allEmails]));

    await supabase
      .from('communication_threads')
      .update({
        last_message_at: message.sent_at,
        participant_emails: mergedEmails,
      })
      .eq('id', params.threadId);

    // Audit: communication_message.added
    await logAction({
      organizationId: thread.organization_id,
      transactionId: thread.transaction_id ?? undefined,
      actorType: 'system',
      action: 'communication_message.added',
      targetType: 'communication_message',
      targetId: message.id,
      metadata: {
        thread_id: params.threadId,
        direction: params.direction,
        from: params.fromAddress,
      },
    });
  }

  return message;
}

/**
 * Returns all threads for a transaction with their message counts.
 */
export async function getThreadsForTransaction(
  transactionId: string,
): Promise<ThreadWithMessageCount[]> {
  const { data, error } = await supabase
    .from('communication_threads')
    .select('*, communication_messages(count)')
    .eq('transaction_id', transactionId)
    .order('last_message_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch threads: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    ...row,
    message_count: row.communication_messages?.[0]?.count ?? 0,
    communication_messages: undefined,
  })) as ThreadWithMessageCount[];
}

/**
 * Returns all messages in a thread ordered by sent date (ascending).
 */
export async function getMessagesForThread(
  threadId: string,
): Promise<CommunicationMessage[]> {
  return messageRepo.findByThreadId(threadId);
}

/**
 * Placeholder for email sync — updates last_synced_at on the connection.
 * Actual sync logic would be handled via an Inngest background job.
 */
export async function syncEmailAccount(
  connectionId: string,
): Promise<EmailAccountConnection> {
  return emailConnRepo.updateSyncStatus(connectionId, 'active');
}

/**
 * Creates a new email account connection record.
 */
export async function connectEmailAccount(
  params: ConnectEmailAccountParams,
): Promise<EmailAccountConnection> {
  const connection = await emailConnRepo.create({
    organization_id: params.orgId,
    user_id: params.userId,
    provider: params.provider,
    email_address: params.email,
    access_token_encrypted: params.credentials.accessToken,
    refresh_token_encrypted: params.credentials.refreshToken,
    token_expires_at: params.credentials.tokenExpiresAt,
    sync_status: 'active',
    last_sync_at: null,
    sync_error: null,
  });

  // Audit: email_account.connected
  await logAction({
    organizationId: params.orgId,
    actorType: 'user',
    actorUserId: params.userId,
    action: 'email_account.connected',
    targetType: 'email_account_connection',
    targetId: connection.id,
    metadata: {
      provider: params.provider,
      email: params.email,
    },
  });

  return connection;
}
