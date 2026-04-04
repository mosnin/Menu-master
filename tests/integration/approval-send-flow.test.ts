import { describe, it, expect } from 'vitest';
import { ApprovalDecisionSchema, CreateReminderSchema } from '@/lib/validation/schemas';
import { OutboundEmailDraftSchema } from '@/lib/validation/ai-schemas';

describe('Approval flow validation', () => {
  it('validates an approval decision', () => {
    const input = {
      approvalId: '550e8400-e29b-41d4-a716-446655440010',
      decision: 'approved' as const,
      decisionNotes: 'Looks good. Approved for sending.',
    };

    const result = ApprovalDecisionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates rejection with notes', () => {
    const input = {
      approvalId: '550e8400-e29b-41d4-a716-446655440010',
      decision: 'rejected' as const,
      decisionNotes: 'Incorrect recipient email. Please update and resubmit.',
    };

    const result = ApprovalDecisionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates approval without notes', () => {
    const input = {
      approvalId: '550e8400-e29b-41d4-a716-446655440010',
      decision: 'approved' as const,
    };

    const result = ApprovalDecisionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid decision values', () => {
    const input = {
      approvalId: '550e8400-e29b-41d4-a716-446655440010',
      decision: 'maybe',
    };

    const result = ApprovalDecisionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing approval ID', () => {
    const input = {
      decision: 'approved',
    };

    const result = ApprovalDecisionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('Outbound email draft validation', () => {
  it('validates an email draft from AI', () => {
    const draft = {
      recipient_name: 'John Smith',
      recipient_email: 'john@example.com',
      subject: 'Reminder: Inspection Deadline Approaching - 123 Main St',
      body: 'Dear John,\n\nThis is a reminder that the inspection deadline for 123 Main St is approaching on March 15, 2024.\n\nPlease ensure your inspection has been scheduled.\n\nBest regards,\nDeal Desk',
      context: 'Automated reminder for inspection deadline based on contract extraction.',
      urgency: 'medium' as const,
    };

    const result = OutboundEmailDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });

  it('validates high urgency email', () => {
    const draft = {
      recipient_name: 'Jane Doe',
      recipient_email: 'jane@example.com',
      subject: 'URGENT: Financing Contingency Expires Tomorrow',
      body: 'Dear Jane,\n\nThe financing contingency deadline is tomorrow.',
      context: 'Financing contingency deadline within 24 hours.',
      urgency: 'high' as const,
    };

    const result = OutboundEmailDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });
});

describe('Reminder scheduling validation', () => {
  it('validates a reminder creation input', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      checklistItemId: '550e8400-e29b-41d4-a716-446655440020',
      reminderType: 'deadline_approaching' as const,
      scheduledFor: '2024-03-13T08:00:00.000Z',
    };

    const result = CreateReminderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates reminder without linked items', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      reminderType: 'follow_up' as const,
      scheduledFor: '2024-04-01T08:00:00.000Z',
    };

    const result = CreateReminderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid reminder type', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      reminderType: 'invalid_type',
      scheduledFor: '2024-04-01T08:00:00.000Z',
    };

    const result = CreateReminderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
