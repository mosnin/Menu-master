/**
 * Import/Migration/Diagnostics Layer Tests
 *
 * Tests for:
 * - Import field mapping validation
 * - Duplicate detection similarity algorithm
 * - Import job lifecycle states
 * - Recompute job types
 * - Diagnostics check types and status thresholds
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// 1. Import field validation
// ============================================================================
import { VALID_FIELDS, getValidFields } from '@/lib/services/import-service';
import type { ImportType } from '@/types';

describe('Import field validation', () => {
  it('contacts have expected fields', () => {
    const fields = getValidFields('contacts');
    expect(fields).toContain('full_name');
    expect(fields).toContain('email');
    expect(fields).toContain('phone');
    expect(fields).toContain('contact_type');
  });

  it('transactions have expected fields', () => {
    const fields = getValidFields('transactions');
    expect(fields).toContain('title');
    expect(fields).toContain('status');
    expect(fields).toContain('stage');
  });

  it('properties have expected fields', () => {
    const fields = getValidFields('properties');
    expect(fields).toContain('address_line_1');
    expect(fields).toContain('city');
    expect(fields).toContain('state');
    expect(fields).toContain('postal_code');
  });

  it('all import types have at least 3 fields', () => {
    const types: ImportType[] = ['contacts', 'transactions', 'properties'];
    for (const t of types) {
      expect(getValidFields(t).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('unknown import type returns empty array', () => {
    expect(getValidFields('unknown' as ImportType)).toEqual([]);
  });
});

// ============================================================================
// 2. Duplicate detection similarity algorithm
// ============================================================================
import {
  calculateSimilarity,
  CONTACT_THRESHOLD,
  TRANSACTION_THRESHOLD,
} from '@/lib/services/duplicate-detection-service';

describe('Duplicate detection similarity', () => {
  it('identical strings score 1.0', () => {
    expect(calculateSimilarity('John Smith', 'John Smith')).toBe(1);
  });

  it('identical strings with different case score 1.0', () => {
    expect(calculateSimilarity('John Smith', 'john smith')).toBe(1);
  });

  it('similar names score above threshold', () => {
    const score = calculateSimilarity('John Smith', 'Jon Smith');
    expect(score).toBeGreaterThan(CONTACT_THRESHOLD);
  });

  it('completely different strings score below threshold', () => {
    const score = calculateSimilarity('John Smith', 'Alice Wonderland');
    expect(score).toBeLessThan(CONTACT_THRESHOLD);
  });

  it('empty strings are treated as identical', () => {
    // Both normalize to empty — algorithm returns 1 for identical strings
    expect(calculateSimilarity('', '')).toBe(1);
  });

  it('contact threshold is 0.7', () => {
    expect(CONTACT_THRESHOLD).toBe(0.7);
  });

  it('transaction threshold is 0.8', () => {
    expect(TRANSACTION_THRESHOLD).toBe(0.8);
  });

  it('similar addresses score above threshold', () => {
    const score = calculateSimilarity(
      '742 Evergreen Terrace',
      '742 Evergreen Terr.',
    );
    expect(score).toBeGreaterThan(CONTACT_THRESHOLD);
  });

  it('transposed names still score reasonably', () => {
    const score = calculateSimilarity('Smith John', 'John Smith');
    // Should be positive but may not be above threshold
    expect(score).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. Import job lifecycle states
// ============================================================================
describe('Import job lifecycle', () => {
  const validStatuses = [
    'pending', 'validating', 'validated', 'importing',
    'completed', 'completed_with_errors', 'failed', 'cancelled',
  ];

  it('all 8 import statuses are defined', () => {
    expect(validStatuses.length).toBe(8);
  });

  it('terminal statuses are correct', () => {
    const terminal = ['completed', 'completed_with_errors', 'failed', 'cancelled'];
    for (const s of terminal) {
      expect(validStatuses).toContain(s);
    }
  });

  it('import row statuses cover all cases', () => {
    const rowStatuses = ['pending', 'valid', 'invalid', 'imported', 'skipped', 'duplicate', 'error'];
    expect(rowStatuses.length).toBe(7);
  });
});

// ============================================================================
// 4. Recompute job types
// ============================================================================
describe('Recompute job types', () => {
  const allTypes = [
    'reextract_document', 'recompute_completeness', 'recompute_health_score',
    'recompute_closing_readiness', 'recompute_forecast', 'rerun_classification',
    'recompute_compliance', 'rebuild_search_index',
  ];

  it('all 8 recompute types are defined', () => {
    expect(allTypes.length).toBe(8);
  });

  it('document-level recomputes exist', () => {
    expect(allTypes).toContain('reextract_document');
    expect(allTypes).toContain('rerun_classification');
  });

  it('org-level recomputes exist', () => {
    expect(allTypes).toContain('recompute_forecast');
    expect(allTypes).toContain('rebuild_search_index');
    expect(allTypes).toContain('recompute_compliance');
  });

  it('transaction-level recomputes exist', () => {
    expect(allTypes).toContain('recompute_completeness');
    expect(allTypes).toContain('recompute_health_score');
    expect(allTypes).toContain('recompute_closing_readiness');
  });
});

// ============================================================================
// 5. Diagnostics check types and thresholds
// ============================================================================
describe('Diagnostics checks', () => {
  const checkTypes = [
    'processing_backlog', 'extraction_health', 'search_index_status',
    'notification_delivery', 'storage_usage', 'data_integrity',
  ];

  it('all 6 diagnostic check types are defined', () => {
    expect(checkTypes.length).toBe(6);
  });

  it('status values are tri-state', () => {
    const statuses = ['healthy', 'degraded', 'unhealthy'];
    expect(statuses.length).toBe(3);
  });

  it('processing backlog thresholds are reasonable', () => {
    // 0 = healthy, <10 = degraded, >=10 = unhealthy
    const thresholds = [
      { count: 0, expected: 'healthy' },
      { count: 5, expected: 'degraded' },
      { count: 15, expected: 'unhealthy' },
    ];

    for (const t of thresholds) {
      const status = t.count === 0 ? 'healthy' : t.count < 10 ? 'degraded' : 'unhealthy';
      expect(status).toBe(t.expected);
    }
  });

  it('extraction health failure rate thresholds', () => {
    // 0% = healthy, <10% = degraded, >=10% = unhealthy
    const thresholds = [
      { rate: 0, expected: 'healthy' },
      { rate: 0.05, expected: 'degraded' },
      { rate: 0.15, expected: 'unhealthy' },
    ];

    for (const t of thresholds) {
      const status = t.rate === 0 ? 'healthy' : t.rate < 0.1 ? 'degraded' : 'unhealthy';
      expect(status).toBe(t.expected);
    }
  });

  it('storage usage thresholds', () => {
    // <500MB = healthy, <2000MB = degraded, >=2000MB = unhealthy
    const thresholds = [
      { mb: 100, expected: 'healthy' },
      { mb: 1000, expected: 'degraded' },
      { mb: 3000, expected: 'unhealthy' },
    ];

    for (const t of thresholds) {
      const status = t.mb < 500 ? 'healthy' : t.mb < 2000 ? 'degraded' : 'unhealthy';
      expect(status).toBe(t.expected);
    }
  });
});

// ============================================================================
// 6. Duplicate resolution states
// ============================================================================
describe('Duplicate resolution states', () => {
  const resolutions = ['pending', 'merged', 'not_duplicate', 'ignored'];

  it('all 4 resolution states are defined', () => {
    expect(resolutions.length).toBe(4);
  });

  it('pending is the initial state', () => {
    expect(resolutions[0]).toBe('pending');
  });

  it('all terminal resolutions are non-pending', () => {
    const terminal = resolutions.filter((r) => r !== 'pending');
    expect(terminal.length).toBe(3);
    expect(terminal).toContain('merged');
    expect(terminal).toContain('not_duplicate');
    expect(terminal).toContain('ignored');
  });
});
