import { supabase } from '@/lib/db/client';
import * as commentRepo from '@/lib/repositories/comments';
import * as mentionRepo from '@/lib/repositories/mentions';
import { logAction } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';
import type { Comment, Mention, CommentEntityType } from '@/types';

// ---------------------------------------------------------------------------
// Mention parsing
// ---------------------------------------------------------------------------

const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Extracts user IDs from `@[Display Name](userId)` patterns in comment body.
 */
function parseMentions(body: string): string[] {
  const userIds: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex before iterating
  MENTION_PATTERN.lastIndex = 0;
  while ((match = MENTION_PATTERN.exec(body)) !== null) {
    const userId = match[2];
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  }

  return userIds;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AddCommentParams {
  entityType: CommentEntityType;
  entityId: string;
  authorUserId: string;
  orgId: string;
  body: string;
  parentCommentId?: string;
  transactionId?: string;
}

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  children?: CommentWithAuthor[];
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a comment, parses @mentions from the body text, creates mention
 * records for each mentioned user, and logs audit events.
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  const comment = await commentRepo.create({
    organization_id: params.orgId,
    transaction_id: params.transactionId ?? params.entityId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    author_user_id: params.authorUserId,
    body: params.body,
    parent_comment_id: params.parentCommentId ?? null,
    is_resolved: false,
    resolved_by_user_id: null,
    resolved_at: null,
  });

  // Audit: comment.created
  await logAction({
    organizationId: params.orgId,
    transactionId: comment.transaction_id,
    actorType: 'user',
    actorUserId: params.authorUserId,
    action: 'comment.created',
    targetType: 'comment',
    targetId: comment.id,
    metadata: {
      entity_type: params.entityType,
      entity_id: params.entityId,
      has_parent: !!params.parentCommentId,
    },
  });

  // Parse @mentions and create mention records
  const mentionedUserIds = parseMentions(params.body);

  for (const mentionedUserId of mentionedUserIds) {
    try {
      const mention = await mentionRepo.create({
        comment_id: comment.id,
        mentioned_user_id: mentionedUserId,
        is_read: false,
      });

      // Audit: mention.created
      await logAction({
        organizationId: params.orgId,
        transactionId: comment.transaction_id,
        actorType: 'user',
        actorUserId: params.authorUserId,
        action: 'mention.created',
        targetType: 'mention',
        targetId: mention.id,
        metadata: {
          comment_id: comment.id,
          mentioned_user_id: mentionedUserId,
        },
      });
    } catch (err) {
      logger.error('Failed to create mention', {
        error: err instanceof Error ? err.message : err,
        commentId: comment.id,
        mentionedUserId,
      });
    }
  }

  return comment;
}

/**
 * Returns comments for an entity with author profiles, organised into a
 * threaded (parent/child) structure. Top-level comments are returned with
 * their children nested under a `children` array.
 */
export async function getComments(
  entityType: CommentEntityType,
  entityId: string,
): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!author_user_id(id, full_name, avatar_url)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch comments: ${error.message}`);

  const all = (data ?? []) as CommentWithAuthor[];

  // Build threaded tree: group children under their parent
  const map = new Map<string, CommentWithAuthor>();
  const roots: CommentWithAuthor[] = [];

  for (const comment of all) {
    comment.children = [];
    map.set(comment.id, comment);
  }

  for (const comment of all) {
    if (comment.parent_comment_id) {
      const parent = map.get(comment.parent_comment_id);
      if (parent) {
        parent.children!.push(comment);
      } else {
        // Orphan child — treat as root
        roots.push(comment);
      }
    } else {
      roots.push(comment);
    }
  }

  return roots;
}

/**
 * Returns all unread mentions for a user.
 */
export async function getMentionsForUser(userId: string): Promise<Mention[]> {
  return mentionRepo.findUnreadByUserId(userId);
}

/**
 * Marks a specific mention as read, validating that it belongs to the given user.
 */
export async function markMentionRead(
  mentionId: string,
  userId: string,
): Promise<Mention> {
  // Verify ownership before marking read
  const { data, error } = await supabase
    .from('mentions')
    .select('*')
    .eq('id', mentionId)
    .eq('mentioned_user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Mention not found or does not belong to user');
  }

  return mentionRepo.markAsRead(mentionId);
}
