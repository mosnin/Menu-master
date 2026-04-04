import { supabase } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.status_changed'
  | 'document.uploaded'
  | 'document.processing_started'
  | 'document.processing_completed'
  | 'document.processing_failed'
  | 'extraction.completed'
  | 'extraction.low_confidence'
  | 'checklist.generated'
  | 'checklist_item.created'
  | 'checklist_item.updated'
  | 'checklist_item.completed'
  | 'timeline_event.created'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'message.drafted'
  | 'message.sent'
  | 'message.failed'
  | 'reminder.scheduled'
  | 'reminder.sent'
  | 'user.signed_in'
  | 'user.profile_synced'
  | 'field_correction.applied'
  | 'completeness.recalculated'
  | 'exception.detected'
  | 'exception.resolved'
  | 'recommendation.generated'
  | 'recommendation.dismissed'
  | 'recommendation.completed'
  | 'assignment.created'
  | 'assignment.removed'
  | 'queue_view.saved'
  | 'comment.created'
  | 'mention.created'
  | 'communication_thread.created'
  | 'communication_message.added'
  | 'email_account.connected'
  | 'rule.created'
  | 'rule.updated'
  | 'template.created'
  | 'template.applied';

interface LogActionParams {
  organizationId?: string;
  transactionId?: string;
  actorType?: 'user' | 'system' | 'ai';
  actorUserId?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAction(params: LogActionParams) {
  const { error } = await supabase.from('audit_logs').insert({
    organization_id: params.organizationId ?? null,
    transaction_id: params.transactionId ?? null,
    actor_type: params.actorType ?? 'system',
    actor_user_id: params.actorUserId ?? null,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    metadata_json: params.metadata ?? null,
  });

  if (error) {
    logger.error('Failed to write audit log', { error, action: params.action, targetType: params.targetType });
  }
}
