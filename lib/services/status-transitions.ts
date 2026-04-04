/**
 * Explicit allowed status transitions for each entity type.
 * These maps define the ONLY valid "from -> to" transitions.
 */

import type {
  ProcessingStatus,
  ApprovalStatus,
  MessageStatus,
  ChecklistItemStatus,
  TransactionStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Transition maps
// ---------------------------------------------------------------------------

export const DOCUMENT_PROCESSING_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  pending: ['processing'],
  processing: ['completed', 'failed', 'manual_review', 'ocr_required'],
  completed: [],            // terminal
  failed: ['pending'],      // allow retry
  ocr_required: ['processing'],
  manual_review: ['processing', 'completed'],
};

export const APPROVAL_STATUS_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: [],    // terminal
  rejected: [],    // terminal
  cancelled: [],   // terminal
};

export const MESSAGE_STATUS_TRANSITIONS: Record<MessageStatus, MessageStatus[]> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'cancelled'],
  approved: ['sending', 'cancelled'],
  sending: ['sent', 'failed'],
  sent: [],         // terminal
  failed: ['sending'],  // allow retry
  cancelled: [],    // terminal
};

export const CHECKLIST_ITEM_TRANSITIONS: Record<ChecklistItemStatus, ChecklistItemStatus[]> = {
  pending: ['in_progress', 'completed', 'skipped', 'needs_review'],
  in_progress: ['completed', 'skipped', 'needs_review', 'pending'],
  needs_review: ['in_progress', 'completed', 'skipped', 'pending'],
  completed: ['pending'],    // allow re-open
  skipped: ['pending'],      // allow re-open
};

export const TRANSACTION_STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['pending_closing', 'cancelled'],
  pending_closing: ['closed', 'active', 'cancelled'],
  closed: [],       // terminal
  cancelled: [],    // terminal
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export class InvalidTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} status transition: "${from}" -> "${to}"`);
    this.name = 'InvalidTransitionError';
  }
}

export function validateDocumentProcessingTransition(
  from: ProcessingStatus,
  to: ProcessingStatus,
): void {
  const allowed = DOCUMENT_PROCESSING_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError('document processing_status', from, to);
  }
}

export function validateApprovalTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
): void {
  const allowed = APPROVAL_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError('approval status', from, to);
  }
}

export function validateMessageTransition(
  from: MessageStatus,
  to: MessageStatus,
): void {
  const allowed = MESSAGE_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError('message status', from, to);
  }
}

export function validateChecklistItemTransition(
  from: ChecklistItemStatus,
  to: ChecklistItemStatus,
): void {
  const allowed = CHECKLIST_ITEM_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError('checklist item status', from, to);
  }
}

export function validateTransactionTransition(
  from: TransactionStatus,
  to: TransactionStatus,
): void {
  const allowed = TRANSACTION_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError('transaction status', from, to);
  }
}
