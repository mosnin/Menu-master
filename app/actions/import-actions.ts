'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as importService from '@/lib/services/import-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import type { ImportType, ImportRowStatus } from '@/types';

export async function createImportJobAction(
  importType: ImportType,
  fileName: string,
  fieldMapping: Record<string, string>,
  options?: { skipDuplicates?: boolean; updateExisting?: boolean },
): Promise<{ data?: { jobId: string }; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };
    const orgId = memberships[0].organization_id;
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const job = await importService.createImportJob({
      organizationId: orgId,
      userId: profile.id,
      importType,
      fileName,
      fieldMapping,
      skipDuplicates: options?.skipDuplicates,
      updateExisting: options?.updateExisting,
    });

    return { data: { jobId: job.id } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create import' };
  }
}

export async function addImportRowsAction(
  jobId: string,
  rows: Array<{ rowNumber: number; rawData: Record<string, unknown> }>,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    await importService.addImportRows(jobId, rows);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to add rows' };
  }
}

export async function validateImportAction(
  jobId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    await importService.validateImportJob(jobId);
    revalidatePath('/admin/imports');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

export async function startImportAction(
  jobId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    await importService.startImport(jobId);
    revalidatePath('/admin/imports');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Import failed' };
  }
}

export async function cancelImportAction(
  jobId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    await importService.cancelImport(jobId, profile.id);
    revalidatePath('/admin/imports');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to cancel import' };
  }
}

export async function getImportJobAction(jobId: string) {
  try {
    await requireAuth();
    const job = await importService.getImportJob(jobId);
    return { data: job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get import job' };
  }
}

export async function getImportJobsAction() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const memberships = await membershipRepo.findByUserId(profile.id);
    if (memberships.length === 0) return { error: 'No organization membership' };

    const jobs = await importService.getImportJobs(memberships[0].organization_id);
    return { data: jobs };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get imports' };
  }
}

export async function getImportRowsAction(
  jobId: string,
  options?: { status?: ImportRowStatus; limit?: number; offset?: number },
) {
  try {
    await requireAuth();
    const rows = await importService.getImportRows(jobId, options);
    return { data: rows };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get import rows' };
  }
}

export async function getValidFieldsAction(importType: ImportType) {
  return { data: importService.getValidFields(importType) };
}
