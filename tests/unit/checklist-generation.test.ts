import { describe, it, expect } from 'vitest';
import { ChecklistGenerationSchema } from '@/lib/validation/ai-schemas';

describe('ChecklistGenerationSchema', () => {
  it('validates a generated checklist', () => {
    const data = {
      items: [
        {
          title: 'Deposit earnest money',
          description: 'Wire $10,000 earnest money deposit to escrow',
          due_date: '2024-02-20',
          priority: 'critical' as const,
          requires_review: false,
        },
        {
          title: 'Schedule home inspection',
          description: 'Contact inspector and schedule within inspection period',
          due_date: '2024-02-25',
          priority: 'high' as const,
          requires_review: false,
        },
        {
          title: 'Review seller disclosures',
          description: 'Review all seller disclosure documents for completeness',
          due_date: null,
          priority: 'medium' as const,
          requires_review: true,
        },
      ],
    };

    const result = ChecklistGenerationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(3);
      expect(result.data.items[0].title).toBe('Deposit earnest money');
      expect(result.data.items[0].priority).toBe('critical');
      expect(result.data.items[2].requires_review).toBe(true);
    }
  });

  it('validates empty checklist', () => {
    const data = { items: [] };
    const result = ChecklistGenerationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority values', () => {
    const data = {
      items: [
        {
          title: 'Test item',
          description: 'test',
          due_date: null,
          priority: 'urgent', // Invalid
          requires_review: false,
        },
      ],
    };

    const result = ChecklistGenerationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates the default buyer purchase checklist structure', () => {
    const defaultItems = [
      { title: 'Deposit earnest money', description: 'Wire earnest money to escrow agent', due_date: null, priority: 'critical' as const, requires_review: false },
      { title: 'Schedule inspection', description: 'Book home inspection within inspection period', due_date: null, priority: 'high' as const, requires_review: false },
      { title: 'Review disclosures', description: 'Review all seller disclosure documents', due_date: null, priority: 'high' as const, requires_review: true },
      { title: 'Secure financing', description: 'Complete loan application and obtain pre-approval', due_date: null, priority: 'high' as const, requires_review: false },
      { title: 'Appraisal completed', description: 'Lender orders and receives appraisal report', due_date: null, priority: 'medium' as const, requires_review: false },
      { title: 'Final walkthrough', description: 'Conduct final property walkthrough before closing', due_date: null, priority: 'medium' as const, requires_review: false },
      { title: 'Confirm title and escrow items', description: 'Verify title commitment and escrow instructions', due_date: null, priority: 'high' as const, requires_review: false },
      { title: 'Closing preparation', description: 'Gather required documents and funds for closing', due_date: null, priority: 'critical' as const, requires_review: false },
    ];

    const result = ChecklistGenerationSchema.safeParse({ items: defaultItems });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(8);
    }
  });
});
