import { describe, it, expect } from 'vitest';
import { PurchaseAgreementExtractionSchema, DisclosureExtractionSchema, GenericDocumentClassificationSchema } from '@/lib/validation/ai-schemas';

describe('PurchaseAgreementExtractionSchema', () => {
  it('validates a complete extraction', () => {
    const data = {
      buyer_name: 'John Smith',
      seller_name: 'Jane Doe',
      property_address: '123 Main St, Denver, CO 80202',
      purchase_price: 450000,
      earnest_money: 10000,
      financing_contingency_date: '2024-03-15',
      inspection_deadline: '2024-02-28',
      closing_date: '2024-04-30',
      broker_name: 'ABC Realty',
      missing_signatures: [],
      missing_addenda: [],
      additional_terms: ['Seller to pay closing costs up to $5,000'],
      confidence: 0.92,
    };

    const result = PurchaseAgreementExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buyer_name).toBe('John Smith');
      expect(result.data.purchase_price).toBe(450000);
      expect(result.data.confidence).toBe(0.92);
    }
  });

  it('validates extraction with null fields', () => {
    const data = {
      buyer_name: null,
      seller_name: null,
      property_address: '123 Main St',
      purchase_price: null,
      earnest_money: null,
      financing_contingency_date: null,
      inspection_deadline: null,
      closing_date: null,
      broker_name: null,
      missing_signatures: ['Buyer signature on page 3'],
      missing_addenda: ['Lead paint disclosure'],
      additional_terms: [],
      confidence: 0.45,
    };

    const result = PurchaseAgreementExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid confidence scores', () => {
    const data = {
      buyer_name: 'John',
      seller_name: 'Jane',
      property_address: '123 Main',
      purchase_price: 100000,
      earnest_money: 5000,
      financing_contingency_date: null,
      inspection_deadline: null,
      closing_date: null,
      broker_name: null,
      missing_signatures: [],
      missing_addenda: [],
      additional_terms: [],
      confidence: 1.5, // Invalid: > 1
    };

    const result = PurchaseAgreementExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing required arrays', () => {
    const data = {
      buyer_name: 'John',
      seller_name: 'Jane',
      property_address: '123 Main',
      purchase_price: 100000,
      earnest_money: 5000,
      financing_contingency_date: null,
      inspection_deadline: null,
      closing_date: null,
      broker_name: null,
      // missing: missing_signatures, missing_addenda, additional_terms
      confidence: 0.9,
    };

    const result = PurchaseAgreementExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('DisclosureExtractionSchema', () => {
  it('validates a complete disclosure extraction', () => {
    const data = {
      disclosure_type: 'Seller Property Disclosure',
      property_address: '456 Oak Ave, Boulder, CO 80301',
      seller_name: 'Jane Doe',
      known_issues: [
        {
          category: 'Plumbing',
          description: 'Slow drain in master bathroom',
          severity: 'low' as const,
        },
        {
          category: 'Structural',
          description: 'Minor crack in basement wall',
          severity: 'medium' as const,
        },
      ],
      missing_sections: ['Environmental hazards'],
      missing_signatures: [],
      confidence: 0.88,
    };

    const result = DisclosureExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates disclosure with empty arrays', () => {
    const data = {
      disclosure_type: null,
      property_address: null,
      seller_name: null,
      known_issues: [],
      missing_sections: [],
      missing_signatures: [],
      confidence: 0.5,
    };

    const result = DisclosureExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('GenericDocumentClassificationSchema', () => {
  it('validates a classification result', () => {
    const data = {
      document_type: 'purchase_agreement' as const,
      confidence: 0.95,
      reasoning: 'Document contains purchase price, closing date, and buyer/seller signatures.',
    };

    const result = GenericDocumentClassificationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid document types', () => {
    const data = {
      document_type: 'invalid_type',
      confidence: 0.5,
      reasoning: 'test',
    };

    const result = GenericDocumentClassificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
