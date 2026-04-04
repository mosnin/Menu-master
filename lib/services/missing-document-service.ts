import { supabase } from '@/lib/db/client';
import * as documentRepo from '@/lib/repositories/documents';

interface MissingDocumentResult {
  missing: string[];
  warnings: string[];
}

/**
 * Deterministic rules engine (NO AI) that checks for missing documents
 * based on the transaction's current state and extracted data.
 */
export async function checkMissingDocuments(
  transactionId: string,
): Promise<MissingDocumentResult> {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Fetch all documents for the transaction
  const documents = await documentRepo.findByTransactionId(transactionId);

  const documentTypes = new Set(
    documents
      .filter((d) => d.document_type !== null)
      .map((d) => d.document_type!),
  );

  // Fetch the latest extraction data to understand the transaction context
  let extractionData: Record<string, unknown> = {};

  for (const doc of documents) {
    if (doc.processing_status === 'completed') {
      const { data: extractions } = await supabase
        .from('document_extractions')
        .select('normalized_data_json')
        .eq('document_id', doc.id)
        .order('extraction_version', { ascending: false })
        .limit(1);

      if (extractions?.[0]?.normalized_data_json) {
        extractionData = {
          ...extractionData,
          ...(extractions[0].normalized_data_json as Record<string, unknown>),
        };
      }
    }
  }

  // --- Rules for buyer purchase transactions ---

  // Rule 1: Check if purchase_agreement exists
  if (!documentTypes.has('purchase_agreement')) {
    missing.push('purchase_agreement');
  }

  // Rule 2: Check if disclosure exists
  if (!documentTypes.has('disclosure')) {
    missing.push('disclosure');
  }

  // Rule 3: Check if financing info exists when financing_contingency_date was extracted
  if (extractionData.financing_contingency_date) {
    if (
      !documentTypes.has('loan_estimate') &&
      !documentTypes.has('closing_disclosure')
    ) {
      missing.push('loan_estimate');
      warnings.push(
        'Financing contingency date was found in the contract, but no loan estimate or closing disclosure has been uploaded.',
      );
    }
  }

  // Rule 4: Check for documents with processing issues
  const failedDocs = documents.filter(
    (d) => d.processing_status === 'failed',
  );
  if (failedDocs.length > 0) {
    warnings.push(
      `${failedDocs.length} document${failedDocs.length === 1 ? '' : 's'} failed processing and may need to be re-uploaded: ${failedDocs.map((d) => d.file_name).join(', ')}`,
    );
  }

  // Rule 5: Check for documents needing manual review
  const manualReviewDocs = documents.filter(
    (d) => d.processing_status === 'manual_review',
  );
  if (manualReviewDocs.length > 0) {
    warnings.push(
      `${manualReviewDocs.length} document${manualReviewDocs.length === 1 ? '' : 's'} require${manualReviewDocs.length === 1 ? 's' : ''} manual review: ${manualReviewDocs.map((d) => d.file_name).join(', ')}`,
    );
  }

  // Rule 6: Check for pending documents that haven't been processed yet
  const pendingDocs = documents.filter(
    (d) => d.processing_status === 'pending',
  );
  if (pendingDocs.length > 0) {
    warnings.push(
      `${pendingDocs.length} document${pendingDocs.length === 1 ? '' : 's'} still pending processing: ${pendingDocs.map((d) => d.file_name).join(', ')}`,
    );
  }

  return { missing, warnings };
}
