'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireOrgMembership, getCurrentUserProfile } from '@/lib/auth/session';
import { uploadDocument } from '@/lib/services/document-service';
import { inngest } from '@/lib/workflows/client';

export async function uploadDocumentAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const file = formData.get('file') as File | null;
    if (!file) return { error: 'No file provided' };

    const transactionId = formData.get('transactionId') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!transactionId) return { error: 'transactionId is required' };

    // Use org from membership if not provided
    const orgId = organizationId || profile.memberships?.[0]?.organization_id;
    if (!orgId) return { error: 'organizationId is required' };

    await requireOrgMembership(orgId);

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const document = await uploadDocument(
      fileBuffer,
      file.name,
      transactionId,
      orgId,
      profile.id,
    );

    // Trigger document processing pipeline
    await inngest.send({
      name: 'document/uploaded',
      data: {
        documentId: document.id,
        transactionId,
        organizationId: orgId,
        userId: profile.id,
      },
    });

    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath(`/transactions/${transactionId}/documents`);

    return { id: document.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to upload document' };
  }
}
