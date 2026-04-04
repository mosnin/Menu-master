'use client';

import { useState, useTransition, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Reply,
  Send,
  Loader2,
  User,
} from 'lucide-react';
import { addCommentAction, getCommentsAction } from '@/app/actions/comment-actions';
import type { Comment, CommentEntityType } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommentWithAuthor extends Comment {
  author_name: string;
  author_avatar_url?: string | null;
}

interface CommentThreadProps {
  entityType: CommentEntityType;
  entityId: string;
  initialComments?: CommentWithAuthor[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMentions(body: string) {
  // Split on @Name patterns (word chars, spaces allowed inside parens-style names)
  const parts = body.split(/(@\w[\w\s]*?\b)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="rounded-md bg-blue-50/70 px-1.5 py-0.5 text-[13px] font-medium text-blue-600"
        >
          {part}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function formatRelativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function buildTree(comments: CommentWithAuthor[]) {
  const roots: CommentWithAuthor[] = [];
  const childMap = new Map<string, CommentWithAuthor[]>();

  for (const c of comments) {
    if (c.parent_comment_id) {
      const siblings = childMap.get(c.parent_comment_id) ?? [];
      siblings.push(c);
      childMap.set(c.parent_comment_id, siblings);
    } else {
      roots.push(c);
    }
  }

  return { roots, childMap };
}

// ---------------------------------------------------------------------------
// Single comment row
// ---------------------------------------------------------------------------

function CommentRow({
  comment,
  depth,
  onReply,
}: {
  comment: CommentWithAuthor;
  depth: number;
  onReply: (parentId: string) => void;
}) {
  return (
    <div
      className="group flex gap-3.5"
      style={{ paddingLeft: depth > 0 ? `${depth * 28}px` : undefined }}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {comment.author_avatar_url ? (
          <img
            src={comment.author_avatar_url}
            alt={comment.author_name}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-border/40"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 ring-1 ring-border/40">
            <User className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-tight">
            {comment.author_name}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {renderMentions(comment.body)}
        </p>
        <button
          onClick={() => onReply(comment.id)}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-foreground"
        >
          <Reply className="h-3 w-3" />
          Reply
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline reply composer
// ---------------------------------------------------------------------------

function ReplyComposer({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="flex gap-3 pl-11 mt-2">
      <div className="flex-1 space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a reply..."
          className="min-h-[72px] resize-none rounded-xl border-border/60 bg-muted/10 text-sm focus-visible:ring-1 focus-visible:ring-ring/30"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 rounded-full px-4 text-xs"
            disabled={!value.trim() || isPending}
            onClick={() => onSubmit(value.trim())}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="h-3 w-3 mr-1.5" />
            )}
            Reply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-4 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CommentThread({
  entityType,
  entityId,
  initialComments = [],
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newBody, setNewBody] = useState('');
  const [isPending, startTransition] = useTransition();

  async function refreshComments() {
    const fresh = (await getCommentsAction(entityType, entityId)) as CommentWithAuthor[];
    setComments(fresh);
  }

  function handleAddComment(body: string, parentCommentId?: string) {
    startTransition(async () => {
      await addCommentAction(entityType, entityId, body, parentCommentId);
      await refreshComments();
      setReplyingTo(null);
      setNewBody('');
    });
  }

  const { roots, childMap } = buildTree(comments);

  function renderComments(list: CommentWithAuthor[], depth: number) {
    return list.map((comment) => {
      const children = childMap.get(comment.id) ?? [];
      return (
        <div key={comment.id} className="space-y-3">
          <CommentRow
            comment={comment}
            depth={depth}
            onReply={(id) => setReplyingTo(id)}
          />
          {replyingTo === comment.id && (
            <ReplyComposer
              onSubmit={(body) => handleAddComment(body, comment.id)}
              onCancel={() => setReplyingTo(null)}
              isPending={isPending}
            />
          )}
          {children.length > 0 && renderComments(children, depth + 1)}
        </div>
      );
    });
  }

  // Empty state
  if (comments.length === 0 && !newBody) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-5" />
          <h3 className="text-lg font-semibold tracking-tight">No comments yet</h3>
          <p className="text-sm text-muted-foreground/80 mt-2 max-w-md leading-relaxed">
            Start a conversation. Use @mentions to notify team members.
          </p>
        </div>

        {/* New comment composer */}
        <div className="space-y-3">
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write a comment... Use @name to mention someone"
            className="min-h-[88px] resize-none rounded-xl border-border/60 bg-muted/10 text-sm focus-visible:ring-1 focus-visible:ring-ring/30"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 rounded-full px-5 text-xs"
              disabled={!newBody.trim() || isPending}
              onClick={() => handleAddComment(newBody.trim())}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3 w-3 mr-1.5" />
              )}
              Comment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thread */}
      <div className="space-y-5">{renderComments(roots, 0)}</div>

      {/* Divider */}
      <div className="h-px bg-border/40" />

      {/* New comment composer */}
      <div className="space-y-3">
        <Textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Write a comment... Use @name to mention someone"
          className="min-h-[88px] resize-none rounded-xl border-border/60 bg-muted/10 text-sm focus-visible:ring-1 focus-visible:ring-ring/30"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-9 rounded-full px-5 text-xs"
            disabled={!newBody.trim() || isPending}
            onClick={() => handleAddComment(newBody.trim())}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="h-3 w-3 mr-1.5" />
            )}
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
