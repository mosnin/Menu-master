import { describe, it, expect } from 'vitest';
import { CreateTransactionSchema, UploadDocumentSchema } from '@/lib/validation/schemas';

describe('Transaction creation flow', () => {
  it('validates a complete transaction creation input', () => {
    const input = {
      title: '123 Main St Purchase - Smith/Doe',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      propertyAddress: {
        addressLine1: '123 Main Street',
        city: 'Denver',
        state: 'CO',
        postalCode: '80202',
      },
      buyerName: 'John Smith',
      buyerEmail: 'john@example.com',
      sellerName: 'Jane Doe',
      sellerEmail: 'jane@example.com',
    };

    const result = CreateTransactionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates minimal transaction creation (title + org only)', () => {
    const input = {
      title: 'New Transaction',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = CreateTransactionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects transaction with empty title', () => {
    const input = {
      title: '',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = CreateTransactionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects transaction with invalid org ID', () => {
    const input = {
      title: 'Test',
      organizationId: 'not-a-uuid',
    };

    const result = CreateTransactionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('validates address with optional fields', () => {
    const input = {
      title: 'Test Transaction',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      propertyAddress: {
        addressLine1: '456 Oak Ave',
        addressLine2: 'Unit B',
        city: 'Boulder',
        state: 'CO',
        postalCode: '80301',
      },
    };

    const result = CreateTransactionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('Document upload metadata flow', () => {
  it('validates document upload input', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      fileName: 'purchase_agreement.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024000,
    };

    const result = UploadDocumentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects document with zero file size', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      fileSize: 0,
    };

    const result = UploadDocumentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('defaults mime type to application/pdf', () => {
    const input = {
      transactionId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      fileName: 'disclosure.pdf',
      fileSize: 512000,
    };

    const result = UploadDocumentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mimeType).toBe('application/pdf');
    }
  });
});
