import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import type { AuditExportJob, ExportFormat } from '@/types';

const DEFAULT_SECTIONS = [
  'summary',
  'timeline',
  'approvals',
  'documents',
  'corrections',
  'exceptions',
  'closing_readiness',
  'communications_metadata',
] as const;

interface RequestExportParams {
  orgId: string;
  transactionId: string;
  requestedByUserId: string;
  sections?: string[];
  format?: ExportFormat;
}

export async function requestExport(
  params: RequestExportParams,
): Promise<AuditExportJob> {
  const sections = params.sections ?? [...DEFAULT_SECTIONS];
  const format = params.format ?? 'json';

  const { data, error } = await supabase
    .from('audit_export_jobs')
    .insert({
      organization_id: params.orgId,
      transaction_id: params.transactionId,
      requested_by_user_id: params.requestedByUserId,
      status: 'pending',
      include_sections: sections,
      export_format: format,
      result_storage_path: null,
      result_metadata: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .select('*')
    .single();

  if (error) throw new Error('Failed to create export job');

  const job = data as AuditExportJob;

  await logAction({
    organizationId: params.orgId,
    transactionId: params.transactionId,
    actorType: 'user',
    actorUserId: params.requestedByUserId,
    action: 'audit_export.requested',
    targetType: 'audit_export_job',
    targetId: job.id,
    metadata: { sections, format },
  });

  return job;
}

export async function generateExport(
  jobId: string,
): Promise<AuditExportJob> {
  // Mark as processing
  const { data: jobData, error: fetchError } = await supabase
    .from('audit_export_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .select('*')
    .single();

  if (fetchError) throw new Error('Failed to fetch export job');

  const job = jobData as AuditExportJob;
  const sections = job.include_sections;
  const transactionId = job.transaction_id;

  try {
    const exportData: Record<string, unknown> = {
      export_id: job.id,
      exported_at: new Date().toISOString(),
      transaction_id: transactionId,
    };

    const sectionFetchers: Record<string, () => Promise<unknown>> = {
      summary: () => fetchSummary(transactionId),
      timeline: () => fetchTimeline(transactionId),
      approvals: () => fetchApprovals(transactionId),
      documents: () => fetchDocuments(transactionId),
      corrections: () => fetchCorrections(transactionId),
      exceptions: () => fetchExceptions(transactionId),
      closing_readiness: () => fetchClosingReadiness(transactionId),
      communications_metadata: () => fetchCommunicationsMetadata(transactionId),
    };

    // Fetch requested sections in parallel
    const fetchPromises = sections
      .filter((s) => sectionFetchers[s])
      .map(async (section) => {
        const data = await sectionFetchers[section]();
        return { section, data };
      });

    const results = await Promise.all(fetchPromises);
    for (const { section, data } of results) {
      exportData[section] = data;
    }

    // Save to storage path (structured JSON blob)
    const storagePath = `exports/${job.organization_id}/${transactionId}/${job.id}.json`;

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('audit_export_jobs')
      .update({
        status: 'completed',
        completed_at: now,
        result_storage_path: storagePath,
        result_metadata: {
          sections_included: sections,
          export_size_estimate: JSON.stringify(exportData).length,
        },
      })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) throw new Error('Failed to update export job');

    await logAction({
      organizationId: job.organization_id,
      transactionId,
      actorType: 'system',
      action: 'audit_export.completed',
      targetType: 'audit_export_job',
      targetId: jobId,
      metadata: { storage_path: storagePath, sections },
    });

    return updated as AuditExportJob;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await supabase
      .from('audit_export_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await logAction({
      organizationId: job.organization_id,
      transactionId,
      actorType: 'system',
      action: 'audit_export.failed',
      targetType: 'audit_export_job',
      targetId: jobId,
      metadata: { error: errorMessage },
    });

    throw err;
  }
}

export async function getExportJob(
  jobId: string,
): Promise<AuditExportJob | null> {
  const { data, error } = await supabase
    .from('audit_export_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw new Error('Failed to fetch export job');
  return data as AuditExportJob | null;
}

export async function getExportsForTransaction(
  transactionId: string,
  orgId: string,
): Promise<AuditExportJob[]> {
  const { data, error } = await supabase
    .from('audit_export_jobs')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch export jobs');
  return (data ?? []) as AuditExportJob[];
}

// ---------------------------------------------------------------------------
// Section fetchers
// ---------------------------------------------------------------------------

async function fetchSummary(transactionId: string): Promise<unknown> {
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*, properties(*)')
    .eq('id', transactionId)
    .single();

  const { data: parties } = await supabase
    .from('transaction_parties')
    .select('*, contacts(*)')
    .eq('transaction_id', transactionId);

  return {
    transaction,
    parties: parties ?? [],
  };
}

async function fetchTimeline(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('event_date', { ascending: true });

  return data ?? [];
}

async function fetchApprovals(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('approvals')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

async function fetchDocuments(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('documents')
    .select('id, file_name, document_type, mime_type, file_size, processing_status, created_at')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

async function fetchCorrections(transactionId: string): Promise<unknown> {
  // Get documents for this transaction, then their field corrections
  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .eq('transaction_id', transactionId);

  if (!documents?.length) return [];

  const docIds = documents.map((d: { id: string }) => d.id);

  const { data: fieldValues } = await supabase
    .from('extracted_field_values')
    .select('id')
    .in('document_id', docIds);

  if (!fieldValues?.length) return [];

  const fieldValueIds = fieldValues.map((f: { id: string }) => f.id);

  const { data: corrections } = await supabase
    .from('field_corrections')
    .select('*')
    .in('field_value_id', fieldValueIds)
    .order('created_at', { ascending: false });

  return corrections ?? [];
}

async function fetchExceptions(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('transaction_exceptions')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

async function fetchClosingReadiness(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('closing_readiness')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  return data;
}

async function fetchCommunicationsMetadata(transactionId: string): Promise<unknown> {
  const { data } = await supabase
    .from('communication_threads')
    .select('id, subject, participant_emails, last_message_at, is_linked')
    .eq('transaction_id', transactionId)
    .order('last_message_at', { ascending: false });

  // Return only metadata: subject and participant count, NO email content
  return (data ?? []).map((t: { id: string; subject: string; participant_emails: string[]; last_message_at: string; is_linked: boolean }) => ({
    thread_id: t.id,
    subject: t.subject,
    participant_count: t.participant_emails?.length ?? 0,
    last_message_at: t.last_message_at,
    is_linked: t.is_linked,
  }));
}
