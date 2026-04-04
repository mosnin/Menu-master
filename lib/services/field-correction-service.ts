import { supabase } from '@/lib/db/client';
import * as fieldCorrectionRepo from '@/lib/repositories/field-corrections';
import * as extractedFieldValueRepo from '@/lib/repositories/extracted-field-values';
import { logAction } from '@/lib/audit/logger';
import type { FieldCorrection, ExtractedFieldValue } from '@/types';

// -----------------------------------------------------------------------------
// Field Correction Service
// Manages corrections to AI-extracted field values with full audit trail.
// -----------------------------------------------------------------------------

interface ApplyCorrectionParams {
  documentId: string;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  correctedByUserId: string;
  reason?: string;
}

export async function applyCorrection(
  params: ApplyCorrectionParams,
): Promise<{ correction: FieldCorrection; fieldValue: ExtractedFieldValue }> {
  // Find the extracted field value for this document + field name
  const fieldValues = await extractedFieldValueRepo.findByDocumentId(
    params.documentId,
  );

  const fieldValue = fieldValues.find(
    (fv) => fv.field_name === params.fieldName,
  );

  if (!fieldValue) {
    throw new Error(
      `No extracted field value found for document ${params.documentId} field "${params.fieldName}"`,
    );
  }

  if (fieldValue.is_locked) {
    throw new Error(
      `Field "${params.fieldName}" is locked and cannot be corrected`,
    );
  }

  // Create the correction record
  const correction = await fieldCorrectionRepo.create({
    field_value_id: fieldValue.id,
    previous_value: params.originalValue,
    new_value: params.correctedValue,
    corrected_by_user_id: params.correctedByUserId,
    correction_reason: params.reason ?? null,
  });

  // Update the extracted field value with the corrected value
  const updatedFieldValue = await extractedFieldValueRepo.updateCorrection(
    fieldValue.id,
    params.correctedValue,
    params.correctedByUserId,
  );

  // Look up the document for org/transaction context
  const { data: document } = await supabase
    .from('documents')
    .select('organization_id, transaction_id')
    .eq('id', params.documentId)
    .single();

  await logAction({
    organizationId: document?.organization_id,
    transactionId: document?.transaction_id,
    actorType: 'user',
    actorUserId: params.correctedByUserId,
    action: 'field_correction.applied',
    targetType: 'extracted_field_value',
    targetId: fieldValue.id,
    metadata: {
      document_id: params.documentId,
      field_name: params.fieldName,
      previous_value: params.originalValue,
      new_value: params.correctedValue,
      reason: params.reason,
    },
  });

  return { correction, fieldValue: updatedFieldValue };
}

export async function getCorrectionsForDocument(
  documentId: string,
): Promise<(FieldCorrection & { field_name: string })[]> {
  // Get all field values for this document, then their corrections
  const fieldValues = await extractedFieldValueRepo.findByDocumentId(documentId);

  const corrections: (FieldCorrection & { field_name: string })[] = [];

  for (const fv of fieldValues) {
    const fvCorrections = await fieldCorrectionRepo.findByFieldValueId(fv.id);
    for (const c of fvCorrections) {
      corrections.push({ ...c, field_name: fv.field_name });
    }
  }

  // Sort by most recent first
  corrections.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return corrections;
}

export async function getCorrectionStats(
  orgId: string,
): Promise<{ field_name: string; correction_count: number }[]> {
  // Get all documents for the org, then aggregate corrections by field name
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('organization_id', orgId);

  if (docError) {
    throw new Error(`Failed to fetch documents: ${docError.message}`);
  }

  if (!documents || documents.length === 0) {
    return [];
  }

  const documentIds = documents.map((d: { id: string }) => d.id);

  // Get all extracted field values for those documents that have corrections
  const { data: correctedFields, error: fieldError } = await supabase
    .from('extracted_field_values')
    .select('id, field_name')
    .in('document_id', documentIds)
    .not('corrected_value', 'is', null);

  if (fieldError) {
    throw new Error(
      `Failed to fetch corrected fields: ${fieldError.message}`,
    );
  }

  if (!correctedFields || correctedFields.length === 0) {
    return [];
  }

  // Count corrections per field value, then aggregate by field name
  const fieldValueIds = correctedFields.map(
    (f: { id: string }) => f.id,
  );

  const { data: allCorrections, error: corrError } = await supabase
    .from('field_corrections')
    .select('field_value_id')
    .in('field_value_id', fieldValueIds);

  if (corrError) {
    throw new Error(`Failed to fetch corrections: ${corrError.message}`);
  }

  // Build a map of field_value_id -> field_name
  const fieldValueToName = new Map<string, string>();
  for (const f of correctedFields) {
    fieldValueToName.set(f.id, f.field_name);
  }

  // Count by field name
  const counts = new Map<string, number>();
  for (const c of allCorrections ?? []) {
    const fieldName = fieldValueToName.get(c.field_value_id);
    if (fieldName) {
      counts.set(fieldName, (counts.get(fieldName) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([field_name, correction_count]) => ({ field_name, correction_count }))
    .sort((a, b) => b.correction_count - a.correction_count);
}
