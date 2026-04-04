import { supabase } from '@/lib/db/client';
import * as exceptionRepo from '@/lib/repositories/transaction-exceptions';
import { logAction } from '@/lib/audit/logger';
import type { TransactionException, ExceptionSeverity } from '@/types';

export async function detectExceptions(
  transactionId: string,
): Promise<TransactionException[]> {
  const detected: TransactionException[] = [];

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id, status, updated_at')
    .eq('id', transactionId)
    .single();

  if (!transaction) return [];

  // 1. Overdue checklist items
  const { data: overdueItems } = await supabase
    .from('checklist_items')
    .select('id, title, due_date')
    .eq('transaction_id', transactionId)
    .lt('due_date', new Date().toISOString())
    .not('status', 'in', '("completed","skipped")');

  for (const item of overdueItems ?? []) {
    const exists = await hasOpenException(transactionId, 'overdue_checklist_item');
    if (!exists) {
      const exception = await exceptionRepo.create({
        transaction_id: transactionId,
        exception_type: 'overdue_checklist_item',
        severity: 'warning' as ExceptionSeverity,
        title: `Overdue: ${item.title}`,
        description: `Checklist item "${item.title}" was due ${item.due_date} and is not yet completed.`,
        resolution_status: 'open',
        resolved_by_user_id: null,
        resolved_at: null,
        metadata: { checklist_item_id: item.id, due_date: item.due_date },
      });
      detected.push(exception);
    }
  }

  // 2. Missing critical documents after 48hrs
  const hoursSinceUpdate =
    (Date.now() - new Date(transaction.updated_at).getTime()) / (1000 * 60 * 60);

  if (hoursSinceUpdate > 48) {
    const { data: purchaseAgreements } = await supabase
      .from('documents')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('document_type', 'purchase_agreement')
      .limit(1);

    if (!purchaseAgreements?.length) {
      const exists = await hasOpenException(transactionId, 'missing_critical_document');
      if (!exists) {
        const exception = await exceptionRepo.create({
          transaction_id: transactionId,
          exception_type: 'missing_critical_document',
          severity: 'critical' as ExceptionSeverity,
          title: 'Missing purchase agreement',
          description: 'No purchase agreement has been uploaded after 48 hours.',
          resolution_status: 'open',
          resolved_by_user_id: null,
          resolved_at: null,
          metadata: { document_type: 'purchase_agreement' },
        });
        detected.push(exception);
      }
    }
  }

  // 3. Stale transactions (no activity in 7+ days)
  const daysSinceUpdate =
    (Date.now() - new Date(transaction.updated_at).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate > 7 && transaction.status !== 'closed' && transaction.status !== 'cancelled') {
    const exists = await hasOpenException(transactionId, 'stale_transaction');
    if (!exists) {
      const exception = await exceptionRepo.create({
        transaction_id: transactionId,
        exception_type: 'stale_transaction',
        severity: 'info' as ExceptionSeverity,
        title: 'Transaction inactive',
        description: `No activity detected in ${Math.floor(daysSinceUpdate)} days.`,
        resolution_status: 'open',
        resolved_by_user_id: null,
        resolved_at: null,
        metadata: { days_inactive: Math.floor(daysSinceUpdate) },
      });
      detected.push(exception);
    }
  }

  // 4. Low confidence extractions
  const { data: txnDocs } = await supabase
    .from('documents')
    .select('id')
    .eq('transaction_id', transactionId);

  const docIds = (txnDocs ?? []).map((d) => d.id);

  if (docIds.length > 0) {
    const { data: lowConfidenceDocs } = await supabase
      .from('document_extractions')
      .select('id, document_id, confidence_score')
      .lt('confidence_score', 0.7)
      .in('document_id', docIds);

    for (const doc of lowConfidenceDocs ?? []) {
      const exists = await hasOpenException(transactionId, 'low_confidence_extraction');
      if (!exists) {
        const exception = await exceptionRepo.create({
          transaction_id: transactionId,
          exception_type: 'low_confidence_extraction',
          severity: 'warning' as ExceptionSeverity,
          title: 'Low confidence extraction',
          description: `Document extraction has confidence score of ${doc.confidence_score}. Manual review recommended.`,
          resolution_status: 'open',
          resolved_by_user_id: null,
          resolved_at: null,
          metadata: { document_id: doc.document_id, confidence_score: doc.confidence_score },
        });
        detected.push(exception);
      }
    }
  }

  if (detected.length > 0) {
    await logAction({
      organizationId: transaction.organization_id,
      transactionId,
      actorType: 'system',
      action: 'exception.detected',
      targetType: 'transaction',
      targetId: transactionId,
      metadata: { count: detected.length, types: detected.map((e) => e.exception_type) },
    });
  }

  return detected;
}

export async function resolveException(
  exceptionId: string,
  userId: string,
  resolution: string,
): Promise<TransactionException> {
  const exception = await exceptionRepo.updateResolution(exceptionId, 'resolved', userId);

  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', exception.transaction_id)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: exception.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'exception.resolved',
    targetType: 'exception',
    targetId: exceptionId,
    metadata: { exception_type: exception.exception_type, resolution },
  });

  return exception;
}

export async function getActiveExceptions(
  transactionId: string,
): Promise<TransactionException[]> {
  return exceptionRepo.findOpenByTransactionId(transactionId);
}

export async function getExceptionsByOrg(
  orgId: string,
): Promise<TransactionException[]> {
  const { data, error } = await supabase
    .from('transaction_exceptions')
    .select('*, transactions!inner(organization_id)')
    .eq('transactions.organization_id', orgId)
    .eq('resolution_status', 'open')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch org exceptions: ${error.message}`);
  return (data ?? []) as TransactionException[];
}

async function hasOpenException(
  transactionId: string,
  exceptionType: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('transaction_exceptions')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('exception_type', exceptionType)
    .eq('resolution_status', 'open')
    .limit(1);

  return (data?.length ?? 0) > 0;
}
