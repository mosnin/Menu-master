'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { applyCorrection, getCorrectionsForDocument } from '@/lib/services/field-correction-service';
import { supabase } from '@/lib/db/client';
import { ApplyFieldCorrectionSchema, UuidSchema } from '@/lib/validation/schemas';

export async function applyFieldCorrectionAction(
  documentId: string,
  fieldName: string,
  originalValue: string,
  correctedValue: string,
  reason?: string,
) {
  const validated = ApplyFieldCorrectionSchema.parse({
    documentId,
    fieldName,
    originalValue,
    correctedValue,
    reason,
  });

  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');

  // Look up the document to find its transaction and org
  const { data: document } = await supabase
    .from('documents')
    .select('transaction_id, organization_id')
    .eq('id', documentId)
    .single();
  if (!document) throw new Error('Document not found');

  await requireOrgMembership(document.organization_id);

  const correction = await applyCorrection({
    documentId: validated.documentId,
    fieldName: validated.fieldName,
    originalValue: validated.originalValue,
    correctedValue: validated.correctedValue,
    reason: validated.reason,
    correctedByUserId: profile.id,
  });

  revalidatePath(`/transactions/${document.transaction_id}`);
  revalidatePath(`/transactions/${document.transaction_id}/documents`);

  return correction;
}

export async function getCorrectionsAction(documentId: string) {
  UuidSchema.parse(documentId);
  await requireAuth();

  // Look up the document to verify org membership
  const { data: document } = await supabase
    .from('documents')
    .select('transaction_id, organization_id')
    .eq('id', documentId)
    .single();
  if (!document) throw new Error('Document not found');

  await requireOrgMembership(document.organization_id);

  const corrections = await getCorrectionsForDocument(documentId);

  return corrections;
}
