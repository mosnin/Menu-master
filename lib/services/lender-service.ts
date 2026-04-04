import { supabase } from '@/lib/db/client';
import * as lenderRepo from '@/lib/repositories/lender-status-updates';
import * as timelineRepo from '@/lib/repositories/timeline-events';
import { logAction } from '@/lib/audit/logger';
import type { LenderStatusUpdate, LenderMilestone } from '@/types';

// Ordered list of lender milestones for progress tracking
const LENDER_MILESTONES: LenderMilestone[] = [
  'pre_approval_received',
  'underwriting_started',
  'appraisal_ordered',
  'appraisal_received',
  'conditional_approval',
  'clear_to_close',
  'funding_confirmed',
];

interface SubmitStatusUpdateParams {
  transactionId: string;
  orgId?: string;
  milestone: LenderMilestone | string;
  status: string;
  notes?: string;
  submittedByUserId?: string;
  submittedByEmail?: string;
  evidenceDocumentId?: string;
}

export async function submitStatusUpdate(
  params: SubmitStatusUpdateParams,
): Promise<LenderStatusUpdate> {
  // Resolve orgId from transaction if not provided
  let orgId = params.orgId;
  if (!orgId) {
    const { data: txn } = await supabase
      .from('transactions')
      .select('organization_id')
      .eq('id', params.transactionId)
      .single();
    orgId = txn?.organization_id;
  }

  const update = await lenderRepo.create({
    transaction_id: params.transactionId,
    organization_id: orgId!,
    milestone: params.milestone as LenderMilestone,
    status: params.status,
    notes: params.notes ?? null,
    submitted_by_user_id: params.submittedByUserId ?? null,
    submitted_by_email: params.submittedByEmail ?? null,
    evidence_document_id: params.evidenceDocumentId ?? null,
  });

  await timelineRepo.create({
    transaction_id: params.transactionId,
    event_type: 'lender_milestone',
    title: `Lender: ${formatMilestone(params.milestone)}`,
    description: params.notes ?? null,
    event_date: new Date().toISOString(),
    status: 'completed',
    source: 'system',
  });

  await logAction({
    organizationId: orgId,
    transactionId: params.transactionId,
    actorType: params.submittedByUserId ? 'user' : 'system',
    actorUserId: params.submittedByUserId,
    action: 'lender_status.updated',
    targetType: 'lender_status_update',
    targetId: update.id,
    metadata: { milestone: params.milestone, status: params.status },
  });

  return update;
}

export async function getStatusUpdates(
  transactionId: string,
): Promise<LenderStatusUpdate[]> {
  return lenderRepo.findByTransactionId(transactionId);
}

export async function getLatestMilestone(
  transactionId: string,
): Promise<LenderStatusUpdate | null> {
  return lenderRepo.findLatestByTransaction(transactionId);
}

export async function getLenderProgress(
  transactionId: string,
): Promise<{ milestone: LenderMilestone; completed: boolean; update: LenderStatusUpdate | null }[]> {
  const updates = await lenderRepo.findByTransactionId(transactionId);
  const completedMilestones = new Set(updates.map((u) => u.milestone));

  return LENDER_MILESTONES.map((milestone) => ({
    milestone,
    completed: completedMilestones.has(milestone),
    update: updates.find((u) => u.milestone === milestone) ?? null,
  }));
}

/** Alias used by action layer */
export const submitLenderUpdate = submitStatusUpdate;

/** Alias used by action layer */
export const getLenderUpdates = getStatusUpdates;

function formatMilestone(milestone: string): string {
  return milestone
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
