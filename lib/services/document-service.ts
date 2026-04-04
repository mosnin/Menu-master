import { supabase } from '@/lib/db/client';
import * as documentRepo from '@/lib/repositories/documents';
import { logAction } from '@/lib/audit/logger';
import { randomUUID } from 'crypto';
import type { Document } from '@/types';

export async function uploadDocument(
  file: Buffer,
  fileName: string,
  transactionId: string,
  orgId: string,
  userId: string,
): Promise<Document> {
  const uuid = randomUUID();
  const storagePath = `${orgId}/${transactionId}/${uuid}_${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
  }

  // Create document record
  const document = await documentRepo.create({
    organization_id: orgId,
    transaction_id: transactionId,
    file_name: fileName,
    storage_path: storagePath,
    mime_type: 'application/pdf',
    file_size: file.length,
    uploaded_by_user_id: userId,
    processing_status: 'pending',
    document_type: null,
  });

  // Audit log
  await logAction({
    organizationId: orgId,
    transactionId,
    actorType: 'user',
    actorUserId: userId,
    action: 'document.uploaded',
    targetType: 'document',
    targetId: document.id,
    metadata: { file_name: fileName, file_size: file.length },
  });

  return document;
}

export async function getDocumentsByTransaction(
  transactionId: string,
): Promise<
  (Document & { latest_extraction?: Record<string, unknown> | null })[]
> {
  const documents = await documentRepo.findByTransactionId(transactionId);

  const results = await Promise.all(
    documents.map(async (doc) => {
      const { data: extractions } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', doc.id)
        .order('extraction_version', { ascending: false })
        .limit(1);

      return {
        ...doc,
        latest_extraction: extractions?.[0] ?? null,
      };
    }),
  );

  return results;
}

export async function getDocumentWithExtraction(documentId: string) {
  const document = await documentRepo.findById(documentId);
  if (!document) return null;

  const { data: extractions } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', documentId)
    .order('extraction_version', { ascending: false });

  return {
    ...document,
    extractions: extractions ?? [],
  };
}
