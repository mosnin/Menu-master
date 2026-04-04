import { supabase } from '@/lib/db/client';
import * as recommendationRepo from '@/lib/repositories/transaction-recommendations';
import { logAction } from '@/lib/audit/logger';
import type { TransactionRecommendation } from '@/types';

export async function generateRecommendations(
  transactionId: string,
): Promise<TransactionRecommendation[]> {
  const generated: TransactionRecommendation[] = [];

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id, status')
    .eq('id', transactionId)
    .single();

  if (!transaction) return [];
  if (transaction.status === 'closed' || transaction.status === 'cancelled') return [];

  const existing = await recommendationRepo.findPendingByTransactionId(transactionId);
  const existingTitles = new Set(existing.map((r) => r.title));

  // 1. Low completeness
  const { data: completeness } = await supabase
    .from('transaction_completeness')
    .select('completeness_score')
    .eq('transaction_id', transactionId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completeness && completeness.completeness_score < 50) {
    const title = 'Complete missing transaction details';
    if (!existingTitles.has(title)) {
      generated.push(await recommendationRepo.create({
        transaction_id: transactionId,
        title,
        reason: `Transaction completeness is only ${completeness.completeness_score}%. Fill in missing fields and upload required documents.`,
        confidence: 0.9,
        risk_level: 'high',
        source_signals: [{ type: 'completeness', score: completeness.completeness_score }],
        suggested_owner_id: null,
        action_type: 'navigate',
        action_payload: { path: `/transactions/${transactionId}/overview` },
        status: 'pending',
        executed_at: null,
      }));
    }
  }

  // 2. Documents pending processing
  const { count: processingCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .in('processing_status', ['pending', 'processing']);

  if (processingCount && processingCount > 0) {
    const title = 'Wait for document processing to complete';
    if (!existingTitles.has(title)) {
      generated.push(await recommendationRepo.create({
        transaction_id: transactionId,
        title,
        reason: `${processingCount} document(s) are still being processed.`,
        confidence: 1.0,
        risk_level: 'low',
        source_signals: [{ type: 'documents_processing', count: processingCount }],
        suggested_owner_id: null,
        action_type: 'navigate',
        action_payload: { path: `/transactions/${transactionId}/documents` },
        status: 'pending',
        executed_at: null,
      }));
    }
  }

  // 3. Overdue checklist items
  const { count: overdueCount } = await supabase
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .lt('due_date', new Date().toISOString())
    .not('status', 'in', '("completed","skipped")');

  if (overdueCount && overdueCount > 0) {
    const title = 'Address overdue checklist items';
    if (!existingTitles.has(title)) {
      generated.push(await recommendationRepo.create({
        transaction_id: transactionId,
        title,
        reason: `${overdueCount} checklist item(s) are past their due date.`,
        confidence: 0.95,
        risk_level: 'high',
        source_signals: [{ type: 'overdue_items', count: overdueCount }],
        suggested_owner_id: null,
        action_type: 'navigate',
        action_payload: { path: `/transactions/${transactionId}/checklist` },
        status: 'pending',
        executed_at: null,
      }));
    }
  }

  // 4. Pending approvals
  const { count: approvalCount } = await supabase
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)
    .eq('status', 'pending');

  if (approvalCount && approvalCount > 0) {
    const title = 'Review pending approvals';
    if (!existingTitles.has(title)) {
      generated.push(await recommendationRepo.create({
        transaction_id: transactionId,
        title,
        reason: `${approvalCount} approval(s) are awaiting review.`,
        confidence: 0.85,
        risk_level: 'medium',
        source_signals: [{ type: 'pending_approvals', count: approvalCount }],
        suggested_owner_id: null,
        action_type: 'navigate',
        action_payload: { path: `/transactions/${transactionId}/approvals` },
        status: 'pending',
        executed_at: null,
      }));
    }
  }

  // 5. No outbound messages
  const { count: messageCount } = await supabase
    .from('outbound_messages')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId);

  if (!messageCount || messageCount === 0) {
    const title = 'Draft introduction email to parties';
    if (!existingTitles.has(title)) {
      generated.push(await recommendationRepo.create({
        transaction_id: transactionId,
        title,
        reason: 'No outbound messages have been drafted. Consider sending an introduction or status update.',
        confidence: 0.7,
        risk_level: 'low',
        source_signals: [{ type: 'no_messages' }],
        suggested_owner_id: null,
        action_type: 'navigate',
        action_payload: { path: `/transactions/${transactionId}/communications` },
        status: 'pending',
        executed_at: null,
      }));
    }
  }

  if (generated.length > 0) {
    await logAction({
      organizationId: transaction.organization_id,
      transactionId,
      actorType: 'system',
      action: 'recommendation.generated',
      targetType: 'transaction',
      targetId: transactionId,
      metadata: { count: generated.length },
    });
  }

  return generated;
}

export async function dismissRecommendation(
  recommendationId: string,
  userId: string,
): Promise<TransactionRecommendation> {
  const rec = await recommendationRepo.updateStatus(recommendationId, 'dismissed');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', rec.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: rec.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'recommendation.dismissed',
    targetType: 'recommendation',
    targetId: recommendationId,
    metadata: { title: rec.title },
  });

  return rec;
}

export async function completeRecommendation(
  recommendationId: string,
  userId: string,
): Promise<TransactionRecommendation> {
  const rec = await recommendationRepo.updateStatus(recommendationId, 'executed');

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', rec.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: rec.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'recommendation.completed',
    targetType: 'recommendation',
    targetId: recommendationId,
    metadata: { title: rec.title },
  });

  return rec;
}

export async function getActiveRecommendations(
  transactionId: string,
): Promise<TransactionRecommendation[]> {
  return recommendationRepo.findPendingByTransactionId(transactionId);
}
