'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as transactionService from '@/lib/services/transaction-service';
import * as auditExportService from '@/lib/services/audit-export-service';

async function getTransactionOrgId(transactionId: string): Promise<string> {
  const transaction = await transactionService.getTransactionWithDetails(transactionId);
  if (!transaction) throw new Error('Transaction not found');
  return transaction.organization_id;
}

export async function requestExportAction(
  transactionId: string,
  sections?: string[],
  format?: import('@/types').ExportFormat | undefined,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['broker_admin']);

    const job = await auditExportService.requestExport({
      orgId,
      transactionId,
      sections,
      format: (format as 'json' | 'pdf') ?? 'json',
      requestedByUserId: profile.id,
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/exports`);

    return { success: true, data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to request export' };
  }
}

export async function getExportJobAction(
  jobId: string,
) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const job = await auditExportService.getExportJob(jobId);
    if (!job) return { error: 'Export job not found' };

    const orgId = await getTransactionOrgId(job.transaction_id);
    await requireRole(orgId, ['broker_admin']);

    return { data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get export job' };
  }
}

export async function getExportsForTransactionAction(
  transactionId: string,
) {
  try {
    await requireAuth();
    const orgId = await getTransactionOrgId(transactionId);
    await requireRole(orgId, ['broker_admin']);

    const exports = await auditExportService.getExportsForTransaction(transactionId, orgId);
    return { data: exports };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get exports' };
  }
}
