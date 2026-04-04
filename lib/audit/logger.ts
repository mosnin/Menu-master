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
  | 'template.applied'
  | 'collaborator.invited'
  | 'collaborator.accepted'
  | 'collaborator.revoked'
  | 'document_request.created'
  | 'document_request.viewed'
  | 'document_request.uploaded'
  | 'document_request.cancelled'
  | 'document_request.reminder_sent'
  | 'lender_status.updated'
  | 'title_status.updated'
  | 'closing_readiness.computed'
  | 'deal_health.computed'
  | 'response_obligation.created'
  | 'response_obligation.responded'
  | 'response_obligation.escalated'
  | 'digest.generated'
  | 'digest.sent'
  | 'audit_export.requested'
  | 'audit_export.completed'
  | 'audit_export.failed'
  | 'economics.created'
  | 'economics.updated'
  | 'economics.finalized'
  | 'commission_split.created'
  | 'commission_split.updated'
  | 'compliance_issue.created'
  | 'compliance_issue.assigned'
  | 'compliance_issue.resolved'
  | 'compliance_issue.overridden'
  | 'compliance_issue.commented'
  | 'policy_rule.created'
  | 'policy_rule.updated'
  | 'policy_rule.toggled'
  | 'policy_override.requested'
  | 'policy_override.approved'
  | 'policy_override.rejected'
  | 'forecast.computed'
  | 'office.created'
  | 'office.updated'
  | 'team.created'
  | 'team.updated'
  | 'stage.changed'
  | 'stage.blocked'
  | 'notification.created'
  | 'notification.read'
  | 'notification.archived'
  | 'search.executed'
  | 'bulk_action.started'
  | 'bulk_action.completed'
  | 'bulk_action.failed'
  | 'import.created'
  | 'import.started'
  | 'import.completed'
  | 'import.failed'
  | 'import.cancelled'
  | 'duplicate.detected'
  | 'duplicate.resolved'
  | 'document_batch.created'
  | 'document_batch.completed'
  | 'document_batch.failed'
  | 'recompute.started'
  | 'recompute.completed'
  | 'recompute.failed'
  | 'diagnostics.checked'
  | 'listing.created'
  | 'listing.updated'
  | 'listing.stage_changed'
  | 'listing.handoff_completed'
  | 'listing.readiness_computed'
  | 'listing.checklist_updated'
  | 'listing.exception_created'
  | 'listing.exception_resolved'
  | 'offer.created'
  | 'offer.updated'
  | 'offer.status_changed'
  | 'offer.accepted'
  | 'seller_portal.invited'
  | 'seller_portal.revoked'
  | 'seller_portal.accessed'
  | 'seller_doc_request.created'
  | 'seller_doc_request.uploaded'
  | 'workflow.run_started'
  | 'workflow.run_completed'
  | 'workflow.run_failed'
  | 'workflow.run_cancelled'
  | 'workflow.step_completed'
  | 'workflow.step_failed'
  | 'workflow.version_created'
  | 'workflow.version_validated'
  | 'workflow.version_published'
  | 'workflow.version_archived';

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
