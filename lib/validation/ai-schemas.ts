import { z } from 'zod';

export const GenericDocumentClassificationSchema = z.object({
  document_type: z.enum([
    'purchase_agreement',
    'disclosure',
    'addendum',
    'inspection_report',
    'appraisal',
    'title_commitment',
    'loan_estimate',
    'closing_disclosure',
    'other',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const PurchaseAgreementExtractionSchema = z.object({
  buyer_name: z.string().nullable(),
  seller_name: z.string().nullable(),
  property_address: z.string().nullable(),
  purchase_price: z.number().nullable(),
  earnest_money: z.number().nullable(),
  financing_contingency_date: z.string().nullable(),
  inspection_deadline: z.string().nullable(),
  closing_date: z.string().nullable(),
  broker_name: z.string().nullable(),
  missing_signatures: z.array(z.string()),
  missing_addenda: z.array(z.string()),
  additional_terms: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const DisclosureExtractionSchema = z.object({
  disclosure_type: z.string().nullable(),
  property_address: z.string().nullable(),
  seller_name: z.string().nullable(),
  known_issues: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
  })),
  missing_sections: z.array(z.string()),
  missing_signatures: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ChecklistGenerationSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
    description: z.string(),
    due_date: z.string().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    requires_review: z.boolean(),
  })),
});

export const OutboundEmailDraftSchema = z.object({
  recipient_name: z.string(),
  recipient_email: z.string(),
  subject: z.string(),
  body: z.string(),
  context: z.string(),
  urgency: z.enum(['low', 'medium', 'high']),
});

export type GenericDocumentClassification = z.infer<typeof GenericDocumentClassificationSchema>;
export type PurchaseAgreementExtraction = z.infer<typeof PurchaseAgreementExtractionSchema>;
export type DisclosureExtraction = z.infer<typeof DisclosureExtractionSchema>;
export type ChecklistGeneration = z.infer<typeof ChecklistGenerationSchema>;
export type OutboundEmailDraft = z.infer<typeof OutboundEmailDraftSchema>;
