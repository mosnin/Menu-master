import { supabase } from '@/lib/db/client';
import * as approvalRepo from '@/lib/repositories/approvals';
import { logAction } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';
import { validateApprovalTransition } from '@/lib/services/status-transitions';
import { sendApprovedMessage } from './message-service';
import type { Approval, ApprovalType, ApprovalStatus } from '@/types';

interface CreateApprovalParams {
  orgId: string;
  transactionId: string;
  approvalType: ApprovalType;
  requestedByUserId: string;
  payload?: Record<string, unknown>;
}

export async function createApproval(
  params: CreateApprovalParams,
): Promise<Approval> {
  const approval = await approvalRepo.create({
    organization_id: params.orgId,
    transaction_id: params.transactionId,
    approval_type: params.approvalType,
    status: 'pending',
    requested_by_user_id: params.requestedByUserId,
    decided_by_user_id: null,
    payload_json: params.payload ?? null,
    decision_notes: null,
    decided_at: null,
    assigned_reviewer_id: null,
  });

  await logAction({
    organizationId: params.orgId,
    transactionId: params.transactionId,
    actorType: 'user',
    actorUserId: params.requestedByUserId,
    action: 'approval.requested',
    targetType: 'approval',
    targetId: approval.id,
    metadata: { approval_type: params.approvalType },
  });

  return approval;
}

export async function decideApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  userId: string,
  notes?: string,
): Promise<Approval> {
  const existing = await approvalRepo.findById(approvalId);
  if (!existing) throw new Error('Approval not found');

  // Validate status transition
  validateApprovalTransition(
    existing.status as ApprovalStatus,
    decision as ApprovalStatus,
  );

  const approval = await approvalRepo.update(approvalId, {
    status: decision,
    decided_by_user_id: userId,
    decision_notes: notes ?? null,
    decided_at: new Date().toISOString(),
  });

  const auditAction =
    decision === 'approved' ? 'approval.approved' : 'approval.rejected';

  await logAction({
    organizationId: existing.organization_id,
    transactionId: existing.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: auditAction as 'approval.approved' | 'approval.rejected',
    targetType: 'approval',
    targetId: approvalId,
    metadata: { approval_type: existing.approval_type, decision, notes },
  });

  // If approved and type is outbound_email, trigger message send
  if (decision === 'approved' && existing.approval_type === 'outbound_email') {
    const messageId = existing.payload_json?.message_id as string | undefined;
    if (messageId) {
      try {
        await sendApprovedMessage(messageId);
      } catch (sendError) {
        logger.error('Failed to send approved message', {
          error: sendError instanceof Error ? sendError.message : sendError,
          messageId,
        });
      }
    }
  }

  return approval;
}

export async function getPendingApprovals(orgId: string): Promise<Approval[]> {
  const { data, error } = await supabase
    .from('approvals')
    .select('*, transactions(title)')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  }

  return (data ?? []) as Approval[];
}

export async function getApprovalsByTransaction(
  transactionId: string,
): Promise<Approval[]> {
  return approvalRepo.findByTransactionId(transactionId);
}
