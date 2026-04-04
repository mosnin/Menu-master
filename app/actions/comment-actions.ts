'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { addComment, getComments, markMentionRead } from '@/lib/services/comment-service';
import { supabase } from '@/lib/db/client';

async function getOrgIdForEntity(entityType: string, entityId: string): Promise<{ orgId: string; transactionId: string | null }> {
  if (entityType === 'transaction') {
    const { data: transaction } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', entityId)
      .single();
    if (!transaction) throw new Error('Transaction not found');
    return { orgId: transaction.organization_id, transactionId: entityId };
  }

  if (entityType === 'document') {
    const { data: document } = await supabase
      .from('documents')
      .select('transaction_id, organization_id')
      .eq('id', entityId)
      .single();
    if (!document) throw new Error('Document not found');
    return { orgId: document.organization_id, transactionId: document.transaction_id };
  }

  if (entityType === 'checklist_item') {
    const { data: item } = await supabase
      .from('checklist_items')
      .select('transaction_id')
      .eq('id', entityId)
      .single();
    if (!item) throw new Error('Checklist item not found');

    const { data: transaction } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', item.transaction_id)
      .single();
    if (!transaction) throw new Error('Transaction not found');
    return { orgId: transaction.organization_id, transactionId: item.transaction_id };
  }

  if (entityType === 'approval') {
    const { data: approval } = await supabase
      .from('approvals')
      .select('transaction_id, organization_id')
      .eq('id', entityId)
      .single();
    if (!approval) throw new Error('Approval not found');
    return { orgId: approval.organization_id, transactionId: approval.transaction_id };
  }

  throw new Error(`Unsupported entity type: ${entityType}`);
}

export async function addCommentAction(
  entityType: string,
  entityId: string,
  body: string,
  parentCommentId?: string,
) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const { orgId, transactionId } = await getOrgIdForEntity(entityType, entityId);
  await requireOrgMembership(orgId);

  const comment = await addComment({
    entityType: entityType as import('@/types').CommentEntityType,
    entityId,
    body,
    parentCommentId,
    authorUserId: profile.id,
    orgId,
  });

  if (transactionId) {
    revalidatePath(`/transactions/${transactionId}`);
  }

  return comment;
}

export async function getCommentsAction(entityType: string, entityId: string) {
  await requireAuth();

  const { orgId } = await getOrgIdForEntity(entityType, entityId);
  await requireOrgMembership(orgId);

  const comments = await getComments(entityType as import('@/types').CommentEntityType, entityId);

  return comments;
}

export async function markMentionReadAction(mentionId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  const result = await markMentionRead(mentionId, profile.id);

  return result;
}
