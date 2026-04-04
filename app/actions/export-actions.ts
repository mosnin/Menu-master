'use server';

import { requireAuth, getCurrentUserProfile, requireRole } from '@/lib/auth/session';

export type ExportSection =
  | 'summary'
  | 'timeline'
  | 'approvals'
  | 'documents'
  | 'corrections'
  | 'exceptions'
  | 'closing_readiness';

export type ExportFormat = 'json';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  transaction_id: string;
  sections: ExportSection[];
  format: ExportFormat;
  status: ExportStatus;
  download_url?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export async function requestExportAction(
  transactionId: string,
  sections: ExportSection[],
  format: ExportFormat = 'json',
): Promise<{ data?: ExportJob; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    // TODO: Check org membership and require broker_admin role
    // await requireRole(orgId, ['broker_admin']);

    // TODO: Create export job in database and enqueue processing
    const job: ExportJob = {
      id: crypto.randomUUID(),
      transaction_id: transactionId,
      sections,
      format,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return { data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to request export' };
  }
}

export async function getExportJobsAction(
  transactionId: string,
): Promise<{ data?: ExportJob[]; error?: string }> {
  try {
    await requireAuth();
    // TODO: Fetch from database once export_jobs table exists
    return { data: [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load export jobs' };
  }
}
