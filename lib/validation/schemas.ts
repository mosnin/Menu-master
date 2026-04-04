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

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;
export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;
export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;
