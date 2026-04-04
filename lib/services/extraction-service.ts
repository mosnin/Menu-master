import { supabase } from '@/lib/db/client';
import * as documentRepo from '@/lib/repositories/documents';
import * as documentExtractionRepo from '@/lib/repositories/document-extractions';
import { classifyDocument } from '@/lib/ai/document-classifier';
import { extractPurchaseAgreement } from '@/lib/ai/purchase-agreement-extractor';
import { extractDisclosure } from '@/lib/ai/disclosure-extractor';
import { logAction } from '@/lib/audit/logger';

const MIN_TEXT_LENGTH = 100;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is a CommonJS module
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return '';
  }
}

export async function processDocument(documentId: string) {
  const document = await documentRepo.findById(documentId);
  if (!document) throw new Error(`Document ${documentId} not found`);

  // Update status to processing (transition validated in repository)
  await documentRepo.updateProcessingStatus(documentId, 'processing');

  // Audit log: processing started
  await logAction({
    organizationId: document.organization_id,
    transactionId: document.transaction_id,
    actorType: 'system',
    action: 'document.processing_started',
    targetType: 'document',
    targetId: documentId,
    metadata: { file_name: document.file_name },
  });

  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError || !fileData) {
    await documentRepo.updateProcessingStatus(documentId, 'failed');

    await logAction({
      organizationId: document.organization_id,
      transactionId: document.transaction_id,
      actorType: 'system',
      action: 'document.processing_failed',
      targetType: 'document',
      targetId: documentId,
      metadata: {
        file_name: document.file_name,
        reason: `Failed to download: ${downloadError?.message}`,
      },
    });

    throw new Error(`Failed to download document: ${downloadError?.message}`);
  }

  // Extract text
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const text = await extractTextFromPdf(buffer);

  // Check if text is too short for extraction
  if (text.length < MIN_TEXT_LENGTH) {
    await documentRepo.updateProcessingStatus(documentId, 'manual_review');
    return { status: 'manual_review', text, document };
  }

  // Classify document
  const classification = await classifyDocument(text);

  // Extract fields based on type
  let extractionResult: Record<string, unknown>;
  const documentType = classification.document_type;

  if (documentType === 'purchase_agreement') {
    extractionResult = await extractPurchaseAgreement(text) as unknown as Record<string, unknown>;
  } else if (documentType === 'disclosure') {
    extractionResult = await extractDisclosure(text) as unknown as Record<string, unknown>;
  } else {
    extractionResult = { classification, text_length: text.length };
  }

  // Store extraction
  const extraction = await documentExtractionRepo.create({
    document_id: documentId,
    extraction_version: 1,
    raw_model_output_json: extractionResult,
    normalized_data_json: extractionResult,
    confidence_score: classification.confidence,
    extracted_at: new Date().toISOString(),
  });

  // Update document status
  await documentRepo.updateProcessingStatus(documentId, 'completed', documentType);

  // Audit log
  await logAction({
    organizationId: document.organization_id,
    transactionId: document.transaction_id,
    actorType: 'ai',
    action: 'extraction.completed',
    targetType: 'document',
    targetId: documentId,
    metadata: {
      document_type: documentType,
      confidence: classification.confidence,
    },
  });

  return {
    status: 'completed',
    documentType,
    extraction,
    extractionResult,
    confidence: classification.confidence,
  };
}
