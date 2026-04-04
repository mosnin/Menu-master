import { inngest } from './client';
import { supabase } from '@/lib/db/client';
import * as documentRepo from '@/lib/repositories/documents';
import * as documentExtractionRepo from '@/lib/repositories/document-extractions';
import { classifyDocument } from '@/lib/ai/document-classifier';
import { extractPurchaseAgreement } from '@/lib/ai/purchase-agreement-extractor';
import { extractDisclosure } from '@/lib/ai/disclosure-extractor';
import {
  generateChecklistFromExtraction,
  flagMissingItems,
} from '@/lib/services/checklist-service';
import * as timelineEventRepo from '@/lib/repositories/timeline-events';
import * as approvalService from '@/lib/services/approval-service';
import * as messageService from '@/lib/services/message-service';
import { logAction } from '@/lib/audit/logger';
import { deadlineReminderTemplate } from '@/lib/email/templates';

export const documentProcessingFunction = inngest.createFunction(
  { id: 'document-processing', name: 'Document Processing Pipeline' },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    const { documentId, transactionId, organizationId, userId } = event.data as {
      documentId: string;
      transactionId: string;
      organizationId: string;
      userId: string;
    };

    // Step 1: Extract text from the PDF document
    const extractedText = await step.run('extract-text', async () => {
      const document = await documentRepo.findById(documentId);
      if (!document) throw new Error(`Document ${documentId} not found`);

      await documentRepo.updateProcessingStatus(documentId, 'processing');

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storage_path);

      if (downloadError || !fileData) {
        console.error('Failed to download document:', downloadError);
        await documentRepo.updateProcessingStatus(documentId, 'failed');
        return null;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      let text: string;
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(fileBuffer);
        text = parsed.text;
      } catch (err) {
        console.error('PDF parsing failed:', err);
        await documentRepo.updateProcessingStatus(documentId, 'manual_review');
        return null;
      }

      // If extracted text is too short, mark for manual review
      if (text.trim().length < 50) {
        await documentRepo.updateProcessingStatus(documentId, 'manual_review');
        return null;
      }

      return text;
    });

    if (!extractedText) {
      return { status: 'manual_review', documentId };
    }

    // Step 2: Classify the document using AI
    const classification = await step.run('classify-document', async () => {
      const result = await classifyDocument(extractedText);
      await documentRepo.updateProcessingStatus(
        documentId,
        'processing',
        result.document_type,
      );
      return result;
    });

    // Step 3: Extract fields based on document type
    const extraction = await step.run('extract-fields', async () => {
      let extractedData: Record<string, unknown>;

      if (classification.document_type === 'purchase_agreement') {
        extractedData = await extractPurchaseAgreement(extractedText);
      } else if (classification.document_type === 'disclosure') {
        extractedData = await extractDisclosure(extractedText);
      } else {
        // For other document types, store the classification only
        extractedData = {
          document_type: classification.document_type,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        };
      }

      // Store the extraction in the database
      const existingExtractions =
        await documentExtractionRepo.findByDocumentId(documentId);
      const version = existingExtractions.length + 1;

      await documentExtractionRepo.create({
        document_id: documentId,
        extraction_version: version,
        raw_model_output_json: extractedData,
        normalized_data_json: extractedData,
        confidence_score: (extractedData as Record<string, unknown>).confidence as number ?? null,
        extracted_at: new Date().toISOString(),
      });

      // Update document status to completed
      await documentRepo.updateProcessingStatus(
        documentId,
        'completed',
        classification.document_type,
      );

      return extractedData;
    });

    // Step 4: Generate checklist items from the extraction
    const checklistItems = await step.run('update-checklist', async () => {
      return generateChecklistFromExtraction(transactionId, extraction);
    });

    // Step 5: Create timeline events from extracted dates
    await step.run('update-timeline', async () => {
      const events: Parameters<typeof timelineEventRepo.createMany>[0] = [];

      if (extraction.closing_date) {
        events.push({
          transaction_id: transactionId,
          event_type: 'closing',
          title: 'Closing Date',
          description: `Scheduled closing date extracted from ${classification.document_type}`,
          event_date: extraction.closing_date as string,
          status: 'upcoming',
          source: 'ai_generated',
        });
      }

      if (extraction.inspection_deadline) {
        events.push({
          transaction_id: transactionId,
          event_type: 'inspection',
          title: 'Inspection Deadline',
          description: `Inspection deadline extracted from ${classification.document_type}`,
          event_date: extraction.inspection_deadline as string,
          status: 'upcoming',
          source: 'ai_generated',
        });
      }

      if (extraction.financing_contingency_date) {
        events.push({
          transaction_id: transactionId,
          event_type: 'financing_contingency',
          title: 'Financing Contingency Deadline',
          description: `Financing contingency date extracted from ${classification.document_type}`,
          event_date: extraction.financing_contingency_date as string,
          status: 'upcoming',
          source: 'ai_generated',
        });
      }

      if (events.length > 0) {
        await timelineEventRepo.createMany(events);
      }

      return events.length;
    });

    // Step 6: Check for missing documents
    const missingDocs = await step.run('check-missing', async () => {
      return flagMissingItems(transactionId, extraction);
    });

    // Step 7: Draft reminder emails for upcoming deadlines
    await step.run('draft-reminders', async () => {
      const now = new Date();
      const deadlines: { title: string; date: string; field: string }[] = [];

      if (extraction.closing_date) {
        deadlines.push({
          title: 'Closing Date',
          date: extraction.closing_date as string,
          field: 'closing_date',
        });
      }
      if (extraction.inspection_deadline) {
        deadlines.push({
          title: 'Inspection Deadline',
          date: extraction.inspection_deadline as string,
          field: 'inspection_deadline',
        });
      }
      if (extraction.financing_contingency_date) {
        deadlines.push({
          title: 'Financing Contingency',
          date: extraction.financing_contingency_date as string,
          field: 'financing_contingency_date',
        });
      }

      const upcoming = deadlines.filter((d) => {
        const deadlineDate = new Date(d.date);
        const daysUntil = Math.ceil(
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysUntil > 0 && daysUntil <= 14;
      });

      for (const deadline of upcoming) {
        const deadlineDate = new Date(deadline.date);
        const daysUntil = Math.ceil(
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        const emailHtml = deadlineReminderTemplate({
          recipientName: 'Transaction Coordinator',
          transactionTitle: `Transaction ${transactionId}`,
          deadlineTitle: deadline.title,
          deadlineDate: deadline.date,
          daysUntil,
        });

        // Create the outbound message
        const message = await messageService.createMessageDraft({
          orgId: organizationId,
          transactionId,
          recipientName: 'Transaction Coordinator',
          recipientEmail: '', // Will be filled by approval reviewer
          subject: `${deadline.title} - ${daysUntil} day${daysUntil === 1 ? '' : 's'} remaining`,
          body: emailHtml,
        });

        // Create an approval for this email draft
        await approvalService.createApproval({
          orgId: organizationId,
          transactionId,
          approvalType: 'outbound_email',
          requestedByUserId: userId,
          payload: {
            outbound_message_id: message.id,
            deadline: deadline.title,
            deadline_date: deadline.date,
            days_until: daysUntil,
          },
        });
      }

      return upcoming.length;
    });

    // Step 8: Log completion
    await step.run('audit-log', async () => {
      await logAction({
        organizationId,
        transactionId,
        actorType: 'system',
        action: 'document.processing_completed',
        targetType: 'document',
        targetId: documentId,
        metadata: {
          documentType: classification.document_type,
          confidence: classification.confidence,
          checklistItemsGenerated: checklistItems.length,
          missingDocuments: missingDocs,
        },
      });
    });

    return {
      status: 'completed',
      documentId,
      documentType: classification.document_type,
      confidence: classification.confidence,
      checklistItemsGenerated: checklistItems.length,
      missingDocuments: missingDocs,
    };
  },
);
