import { describe, it, expect } from 'vitest';
import {
  validateDocumentProcessingTransition,
  validateApprovalTransition,
  validateMessageTransition,
  validateChecklistItemTransition,
  validateTransactionTransition,
  InvalidTransitionError,
  DOCUMENT_PROCESSING_TRANSITIONS,
  APPROVAL_STATUS_TRANSITIONS,
  MESSAGE_STATUS_TRANSITIONS,
  CHECKLIST_ITEM_TRANSITIONS,
  TRANSACTION_STATUS_TRANSITIONS,
} from '@/lib/services/status-transitions';

describe('Document processing status transitions', () => {
  it('allows pending → processing', () => {
    expect(() => validateDocumentProcessingTransition('pending', 'processing')).not.toThrow();
  });

  it('allows processing → completed', () => {
    expect(() => validateDocumentProcessingTransition('processing', 'completed')).not.toThrow();
  });

  it('allows processing → failed', () => {
    expect(() => validateDocumentProcessingTransition('processing', 'failed')).not.toThrow();
  });

  it('allows processing → manual_review', () => {
    expect(() => validateDocumentProcessingTransition('processing', 'manual_review')).not.toThrow();
  });

  it('allows failed → pending (retry)', () => {
    expect(() => validateDocumentProcessingTransition('failed', 'pending')).not.toThrow();
  });

  it('blocks pending → completed (must go through processing)', () => {
    expect(() => validateDocumentProcessingTransition('pending', 'completed')).toThrow(InvalidTransitionError);
  });

  it('blocks completed → pending (terminal state)', () => {
    expect(() => validateDocumentProcessingTransition('completed', 'pending')).toThrow(InvalidTransitionError);
  });

  it('blocks completed → processing (terminal state)', () => {
    expect(() => validateDocumentProcessingTransition('completed', 'processing')).toThrow(InvalidTransitionError);
  });

  it('every status has a defined transition map entry', () => {
    const statuses = ['pending', 'processing', 'completed', 'failed', 'ocr_required', 'manual_review'] as const;
    for (const s of statuses) {
      expect(DOCUMENT_PROCESSING_TRANSITIONS[s]).toBeDefined();
    }
  });
});

describe('Approval status transitions', () => {
  it('allows pending → approved', () => {
    expect(() => validateApprovalTransition('pending', 'approved')).not.toThrow();
  });

  it('allows pending → rejected', () => {
    expect(() => validateApprovalTransition('pending', 'rejected')).not.toThrow();
  });

  it('allows pending → cancelled', () => {
    expect(() => validateApprovalTransition('pending', 'cancelled')).not.toThrow();
  });

  it('blocks approved → pending (terminal)', () => {
    expect(() => validateApprovalTransition('approved', 'pending')).toThrow(InvalidTransitionError);
  });

  it('blocks rejected → approved (terminal)', () => {
    expect(() => validateApprovalTransition('rejected', 'approved')).toThrow(InvalidTransitionError);
  });

  it('blocks approved → rejected (terminal)', () => {
    expect(() => validateApprovalTransition('approved', 'rejected')).toThrow(InvalidTransitionError);
  });

  it('all terminal states have empty transition arrays', () => {
    expect(APPROVAL_STATUS_TRANSITIONS['approved']).toEqual([]);
    expect(APPROVAL_STATUS_TRANSITIONS['rejected']).toEqual([]);
    expect(APPROVAL_STATUS_TRANSITIONS['cancelled']).toEqual([]);
  });
});

describe('Message status transitions', () => {
  it('allows draft → pending_approval', () => {
    expect(() => validateMessageTransition('draft', 'pending_approval')).not.toThrow();
  });

  it('allows pending_approval → approved', () => {
    expect(() => validateMessageTransition('pending_approval', 'approved')).not.toThrow();
  });

  it('allows approved → sending', () => {
    expect(() => validateMessageTransition('approved', 'sending')).not.toThrow();
  });

  it('allows sending → sent', () => {
    expect(() => validateMessageTransition('sending', 'sent')).not.toThrow();
  });

  it('allows sending → failed', () => {
    expect(() => validateMessageTransition('sending', 'failed')).not.toThrow();
  });

  it('allows failed → sending (retry)', () => {
    expect(() => validateMessageTransition('failed', 'sending')).not.toThrow();
  });

  it('blocks draft → sent (must go through approval)', () => {
    expect(() => validateMessageTransition('draft', 'sent')).toThrow(InvalidTransitionError);
  });

  it('blocks draft → sending (must be approved first)', () => {
    expect(() => validateMessageTransition('draft', 'sending')).toThrow(InvalidTransitionError);
  });

  it('blocks sent → sending (terminal)', () => {
    expect(() => validateMessageTransition('sent', 'sending')).toThrow(InvalidTransitionError);
  });

  it('blocks pending_approval → sending (must be approved first)', () => {
    expect(() => validateMessageTransition('pending_approval', 'sending')).toThrow(InvalidTransitionError);
  });

  it('sent is terminal', () => {
    expect(MESSAGE_STATUS_TRANSITIONS['sent']).toEqual([]);
  });

  it('cancelled is terminal', () => {
    expect(MESSAGE_STATUS_TRANSITIONS['cancelled']).toEqual([]);
  });
});

describe('Checklist item status transitions', () => {
  it('allows pending → in_progress', () => {
    expect(() => validateChecklistItemTransition('pending', 'in_progress')).not.toThrow();
  });

  it('allows pending → completed', () => {
    expect(() => validateChecklistItemTransition('pending', 'completed')).not.toThrow();
  });

  it('allows in_progress → completed', () => {
    expect(() => validateChecklistItemTransition('in_progress', 'completed')).not.toThrow();
  });

  it('allows completed → pending (re-open)', () => {
    expect(() => validateChecklistItemTransition('completed', 'pending')).not.toThrow();
  });

  it('allows skipped → pending (re-open)', () => {
    expect(() => validateChecklistItemTransition('skipped', 'pending')).not.toThrow();
  });

  it('blocks completed → skipped (must re-open first)', () => {
    expect(() => validateChecklistItemTransition('completed', 'skipped')).toThrow(InvalidTransitionError);
  });

  it('blocks completed → in_progress (must re-open first)', () => {
    expect(() => validateChecklistItemTransition('completed', 'in_progress')).toThrow(InvalidTransitionError);
  });
});

describe('Transaction status transitions', () => {
  it('allows draft → active', () => {
    expect(() => validateTransactionTransition('draft', 'active')).not.toThrow();
  });

  it('allows active → pending_closing', () => {
    expect(() => validateTransactionTransition('active', 'pending_closing')).not.toThrow();
  });

  it('allows pending_closing → closed', () => {
    expect(() => validateTransactionTransition('pending_closing', 'closed')).not.toThrow();
  });

  it('allows draft → cancelled', () => {
    expect(() => validateTransactionTransition('draft', 'cancelled')).not.toThrow();
  });

  it('allows active → cancelled', () => {
    expect(() => validateTransactionTransition('active', 'cancelled')).not.toThrow();
  });

  it('allows pending_closing → active (step back)', () => {
    expect(() => validateTransactionTransition('pending_closing', 'active')).not.toThrow();
  });

  it('blocks draft → closed (must go through active)', () => {
    expect(() => validateTransactionTransition('draft', 'closed')).toThrow(InvalidTransitionError);
  });

  it('blocks closed → active (terminal)', () => {
    expect(() => validateTransactionTransition('closed', 'active')).toThrow(InvalidTransitionError);
  });

  it('blocks cancelled → draft (terminal)', () => {
    expect(() => validateTransactionTransition('cancelled', 'draft')).toThrow(InvalidTransitionError);
  });

  it('closed is terminal', () => {
    expect(TRANSACTION_STATUS_TRANSITIONS['closed']).toEqual([]);
  });

  it('cancelled is terminal', () => {
    expect(TRANSACTION_STATUS_TRANSITIONS['cancelled']).toEqual([]);
  });
});

describe('InvalidTransitionError', () => {
  it('has descriptive message', () => {
    const error = new InvalidTransitionError('test entity', 'from', 'to');
    expect(error.message).toBe('Invalid test entity status transition: "from" -> "to"');
    expect(error.name).toBe('InvalidTransitionError');
  });

  it('is an instance of Error', () => {
    const error = new InvalidTransitionError('test', 'a', 'b');
    expect(error).toBeInstanceOf(Error);
  });
});
