import * as importJobRepo from '@/lib/repositories/import-jobs';
import * as importRowRepo from '@/lib/repositories/import-rows';
import { logAction } from '@/lib/audit/logger';
import type { ImportJob, ImportType, ImportRowStatus } from '@/types';

// Valid fields per import type
const VALID_FIELDS: Record<ImportType, string[]> = {
  contacts: ['full_name', 'email', 'phone', 'contact_type'],
  transactions: ['title', 'status', 'stage'],
  properties: ['address_line_1', 'address_line_2', 'city', 'state', 'postal_code'],
};

export function getValidFields(importType: ImportType): string[] {
  return VALID_FIELDS[importType] ?? [];
}

export async function createImportJob(input: {
  organizationId: string;
  userId: string;
  importType: ImportType;
  fileName: string;
  fileSize?: number;
  fieldMapping: Record<string, string>;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
}): Promise<ImportJob> {
  const job = await importJobRepo.create({
    organization_id: input.organizationId,
    created_by_user_id: input.userId,
    import_type: input.importType,
    file_name: input.fileName,
    file_size: input.fileSize ?? null,
    storage_path: null,
    field_mapping: input.fieldMapping,
    status: 'pending',
    total_rows: 0,
    valid_rows: 0,
    imported_rows: 0,
    skipped_rows: 0,
    error_rows: 0,
    duplicate_rows: 0,
    skip_duplicates: input.skipDuplicates ?? true,
    update_existing: input.updateExisting ?? false,
    dry_run: false,
    validation_errors: [],
    started_at: null,
    completed_at: null,
  });

  await logAction({
    organizationId: input.organizationId,
    actorType: 'user',
    actorUserId: input.userId,
    action: 'import.created',
    targetType: 'import_job',
    targetId: job.id,
    metadata: { import_type: input.importType, file_name: input.fileName },
  });

  return job;
}

export async function addImportRows(
  jobId: string,
  rows: Array<{ rowNumber: number; rawData: Record<string, unknown> }>,
): Promise<void> {
  const importRows = rows.map((r) => ({
    import_job_id: jobId,
    row_number: r.rowNumber,
    raw_data: r.rawData,
    mapped_data: null,
    status: 'pending' as ImportRowStatus,
    error_message: null,
    duplicate_of_id: null,
    created_entity_type: null,
    created_entity_id: null,
  }));

  await importRowRepo.createMany(importRows);
  await importJobRepo.update(jobId, { total_rows: rows.length });
}

export async function validateImportJob(jobId: string): Promise<ImportJob> {
  await importJobRepo.update(jobId, { status: 'validating' });

  const rows = await importRowRepo.findByJobId(jobId);
  const job = await importJobRepo.findById(jobId);
  if (!job) throw new Error('Import job not found');

  const validFields = getValidFields(job.import_type);
  const errors: Record<string, unknown>[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const row of rows) {
    const mappedData: Record<string, unknown> = {};
    let isValid = true;

    for (const [csvCol, dbField] of Object.entries(job.field_mapping)) {
      if (!validFields.includes(dbField)) {
        errors.push({ row: row.row_number, field: dbField, error: `Unknown field: ${dbField}` });
        isValid = false;
        continue;
      }
      mappedData[dbField] = row.raw_data[csvCol] ?? null;
    }

    await importRowRepo.update(row.id, {
      mapped_data: mappedData,
      status: isValid ? 'valid' : 'invalid',
      error_message: isValid ? null : 'Validation failed',
    });

    if (isValid) validCount++;
    else invalidCount++;
  }

  return importJobRepo.update(jobId, {
    status: 'validated',
    valid_rows: validCount,
    error_rows: invalidCount,
    validation_errors: errors,
  });
}

export async function startImport(jobId: string): Promise<ImportJob> {
  return importJobRepo.update(jobId, {
    status: 'importing',
    started_at: new Date().toISOString(),
  });
}

export async function completeImport(
  jobId: string,
  results: { imported: number; skipped: number; errors: number; duplicates: number },
): Promise<ImportJob> {
  const status = results.errors > 0
    ? (results.imported > 0 ? 'completed_with_errors' : 'failed')
    : 'completed';

  const job = await importJobRepo.update(jobId, {
    status,
    imported_rows: results.imported,
    skipped_rows: results.skipped,
    error_rows: results.errors,
    duplicate_rows: results.duplicates,
    completed_at: new Date().toISOString(),
  });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'system',
    action: status === 'failed' ? 'import.failed' : 'import.completed',
    targetType: 'import_job',
    targetId: jobId,
    metadata: { ...results },
  });

  return job;
}

export async function cancelImport(jobId: string, userId: string): Promise<ImportJob> {
  const job = await importJobRepo.update(jobId, { status: 'cancelled' });

  await logAction({
    organizationId: job.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'import.cancelled',
    targetType: 'import_job',
    targetId: jobId,
  });

  return job;
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  return importJobRepo.findById(jobId);
}

export async function getImportJobs(orgId: string, limit = 20): Promise<ImportJob[]> {
  return importJobRepo.findByOrgId(orgId, { limit });
}

export async function getImportRows(
  jobId: string,
  options?: { status?: ImportRowStatus; limit?: number; offset?: number },
) {
  return importRowRepo.findByJobId(jobId, options);
}

// Re-export for convenience
export { VALID_FIELDS };
