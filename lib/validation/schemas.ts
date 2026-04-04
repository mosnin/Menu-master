import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  organizationId: z.string().uuid(),
  propertyAddress: z.object({
    addressLine1: z.string().min(1, 'Address is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2).max(2),
    postalCode: z.string().min(5).max(10),
  }).optional(),
  buyerName: z.string().optional(),
  buyerEmail: z.string().email().optional().or(z.literal('')),
  sellerName: z.string().optional(),
  sellerEmail: z.string().email().optional().or(z.literal('')),
});

export const UpdateTransactionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'active', 'pending_closing', 'closed', 'cancelled']).optional(),
});

export const UploadDocumentSchema = z.object({
  transactionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string().default('application/pdf'),
  fileSize: z.number().positive(),
});

export const UpdateChecklistItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'needs_review']).optional(),
  dueDate: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const CreateChecklistItemSchema = z.object({
  transactionId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  source: z.enum(['manual', 'ai_generated', 'template']).default('manual'),
  requiresReview: z.boolean().default(false),
});

export const ApprovalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  decisionNotes: z.string().optional(),
});

export const CreateReminderSchema = z.object({
  transactionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  checklistItemId: z.string().uuid().optional(),
  timelineEventId: z.string().uuid().optional(),
  reminderType: z.enum(['deadline_approaching', 'overdue', 'action_required', 'follow_up']),
  scheduledFor: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Phase 2 schemas
// ---------------------------------------------------------------------------

export const UuidSchema = z.string().uuid('Invalid UUID');

export const ApplyFieldCorrectionSchema = z.object({
  documentId: z.string().uuid(),
  fieldName: z.string().min(1, 'Field name is required'),
  originalValue: z.string(),
  correctedValue: z.string().min(1, 'Corrected value is required'),
  reason: z.string().optional(),
});

export const ResolveExceptionSchema = z.object({
  exceptionId: z.string().uuid(),
  resolution: z.string().min(1, 'Resolution is required'),
});

export const AssignTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['primary_agent', 'coordinator_owner', 'broker_reviewer']),
});

export const AssignChecklistItemSchema = z.object({
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const AssignApprovalReviewerSchema = z.object({
  approvalId: z.string().uuid(),
  reviewerId: z.string().uuid(),
});

export const AddCommentSchema = z.object({
  entityType: z.enum(['transaction', 'document', 'approval', 'checklist_item']),
  entityId: z.string().uuid(),
  body: z.string().min(1, 'Comment body is required').max(10000),
  parentCommentId: z.string().uuid().optional(),
});

export const CreateRuleSchema = z.object({
  ruleType: z.string().min(1, 'Rule type is required'),
  name: z.string().min(1, 'Rule name is required').max(200),
  conditions: z.record(z.unknown()),
  actions: z.record(z.unknown()),
});

export const CreateTemplateSchema = z.object({
  templateType: z.string().min(1, 'Template type is required'),
  name: z.string().min(1, 'Template name is required').max(200),
  contentJson: z.record(z.unknown()),
});

export const ApplyTemplateSchema = z.object({
  templateId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

export type ApplyFieldCorrectionInput = z.infer<typeof ApplyFieldCorrectionSchema>;
export type ResolveExceptionInput = z.infer<typeof ResolveExceptionSchema>;
export type AssignTransactionInput = z.infer<typeof AssignTransactionSchema>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
export type CreateRuleInput = z.infer<typeof CreateRuleSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>;

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;
export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;
export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;
