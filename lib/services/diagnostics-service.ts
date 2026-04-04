import { supabase } from '@/lib/db/client';
import * as diagnosticsRepo from '@/lib/repositories/system-diagnostics';
import { logAction } from '@/lib/audit/logger';
import type { SystemDiagnostic, DiagnosticCheckType, DiagnosticStatus } from '@/types';

interface DiagnosticResult {
  check_type: DiagnosticCheckType;
  status: DiagnosticStatus;
  details: Record<string, unknown>;
}

export async function runDiagnostics(orgId: string): Promise<SystemDiagnostic[]> {
  const results: DiagnosticResult[] = await Promise.all([
    checkProcessingBacklog(orgId),
    checkExtractionHealth(orgId),
    checkDataIntegrity(orgId),
    checkStorageUsage(orgId),
  ]);

  const diagnostics: SystemDiagnostic[] = [];
  for (const result of results) {
    const diag = await diagnosticsRepo.create({
      organization_id: orgId,
      check_type: result.check_type,
      status: result.status,
      details: result.details,
    });
    diagnostics.push(diag);
  }

  await logAction({
    organizationId: orgId,
    actorType: 'system',
    action: 'diagnostics.checked',
    targetType: 'system_diagnostics',
    metadata: {
      checks: results.length,
      unhealthy: results.filter((r) => r.status === 'unhealthy').length,
    },
  });

  return diagnostics;
}

async function checkProcessingBacklog(orgId: string): Promise<DiagnosticResult> {
  const { count: pendingDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('processing_status', ['pending', 'processing']);

  const backlog = pendingDocs ?? 0;
  const status: DiagnosticStatus = backlog === 0 ? 'healthy' : backlog < 10 ? 'degraded' : 'unhealthy';

  return {
    check_type: 'processing_backlog',
    status,
    details: { pending_documents: backlog },
  };
}

async function checkExtractionHealth(orgId: string): Promise<DiagnosticResult> {
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const { count: failedDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('processing_status', 'failed');

  const total = totalDocs ?? 0;
  const failed = failedDocs ?? 0;
  const failRate = total > 0 ? failed / total : 0;
  const status: DiagnosticStatus = failRate === 0 ? 'healthy' : failRate < 0.1 ? 'degraded' : 'unhealthy';

  return {
    check_type: 'extraction_health',
    status,
    details: { total_documents: total, failed_extractions: failed, failure_rate: Math.round(failRate * 100) },
  };
}

async function checkDataIntegrity(orgId: string): Promise<DiagnosticResult> {
  // Check for orphaned records: documents without valid transactions
  const { count: orphanedDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('transaction_id', null);

  // Check for transactions without properties (after intake stage)
  const { count: missingProperties } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .neq('stage', 'intake')
    .is('property_id', null);

  const issues = (orphanedDocs ?? 0) + (missingProperties ?? 0);
  const status: DiagnosticStatus = issues === 0 ? 'healthy' : issues < 5 ? 'degraded' : 'unhealthy';

  return {
    check_type: 'data_integrity',
    status,
    details: { orphaned_documents: orphanedDocs ?? 0, transactions_missing_property: missingProperties ?? 0 },
  };
}

async function checkStorageUsage(orgId: string): Promise<DiagnosticResult> {
  const { data: docs } = await supabase
    .from('documents')
    .select('file_size')
    .eq('organization_id', orgId);

  const totalBytes = (docs ?? []).reduce((sum, d) => sum + (d.file_size ?? 0), 0);
  const totalMB = Math.round(totalBytes / (1024 * 1024));
  const status: DiagnosticStatus = totalMB < 500 ? 'healthy' : totalMB < 2000 ? 'degraded' : 'unhealthy';

  return {
    check_type: 'storage_usage',
    status,
    details: { total_bytes: totalBytes, total_mb: totalMB, document_count: docs?.length ?? 0 },
  };
}

export async function getLatestDiagnostics(orgId: string): Promise<SystemDiagnostic[]> {
  return diagnosticsRepo.findLatestByOrg(orgId);
}

export async function getDiagnosticHistory(
  orgId: string,
  checkType: DiagnosticCheckType,
  limit = 10,
): Promise<SystemDiagnostic[]> {
  return diagnosticsRepo.findByCheckType(orgId, checkType, limit);
}
