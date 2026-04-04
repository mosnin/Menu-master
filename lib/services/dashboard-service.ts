import { supabase } from '@/lib/db/client';
import * as transactionRepo from '@/lib/repositories/transactions';
import * as documentRepo from '@/lib/repositories/documents';
import * as checklistItemRepo from '@/lib/repositories/checklist-items';
import { checkMissingDocuments } from './missing-document-service';
import type {
  Transaction,
  Document,
  ChecklistItem,
  Approval,
} from '@/types';

interface DashboardData {
  transactionsNeedingAttention: Transaction[];
  upcomingDeadlines: ChecklistItem[];
  pendingApprovals: {
    count: number;
    items: Approval[];
  };
  recentDocuments: Document[];
  transactionsWithMissingDocs: Array<{
    transaction: Transaction;
    missing: string[];
    warnings: string[];
  }>;
  transactionsWithExtractionIssues: Document[];
}

export async function getDashboardData(
  orgId: string,
): Promise<DashboardData> {
  // Fetch active transactions needing attention
  const transactionsNeedingAttention =
    await transactionRepo.findNeedingAttention(orgId);

  // Fetch upcoming deadlines: checklist items due in next 14 days
  const upcomingDeadlines = await checklistItemRepo.findUpcoming(orgId, 14);

  // Fetch pending approvals
  const { data: pendingApprovalItems, error: approvalError } = await supabase
    .from('approvals')
    .select('*, transactions(title)')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (approvalError) {
    throw new Error(
      `Failed to fetch pending approvals: ${approvalError.message}`,
    );
  }

  const pendingApprovals = {
    count: pendingApprovalItems?.length ?? 0,
    items: (pendingApprovalItems ?? []) as Approval[],
  };

  // Fetch recent documents (last 10)
  const recentDocuments = await documentRepo.findRecentByOrgId(orgId, 10);

  // Check for missing documents across active transactions
  const transactionsWithMissingDocs: DashboardData['transactionsWithMissingDocs'] =
    [];

  for (const tx of transactionsNeedingAttention) {
    const result = await checkMissingDocuments(tx.id);
    if (result.missing.length > 0 || result.warnings.length > 0) {
      transactionsWithMissingDocs.push({
        transaction: tx,
        missing: result.missing,
        warnings: result.warnings,
      });
    }
  }

  // Fetch documents with extraction issues
  const transactionsWithExtractionIssues =
    await documentRepo.findWithExtractionIssues(orgId);

  return {
    transactionsNeedingAttention,
    upcomingDeadlines,
    pendingApprovals,
    recentDocuments,
    transactionsWithMissingDocs,
    transactionsWithExtractionIssues,
  };
}
