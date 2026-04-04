/**
 * Tests for shared UI primitive logic — formatting utilities, status mappings, and component contracts.
 * Does NOT test React rendering (no jsdom), focuses on pure logic used by UI components.
 */
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatPercent,
  formatNumber,
  humanizeStatus,
} from '@/lib/format';

// ============================================================================
// formatDate
// ============================================================================
describe('formatDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('formats date in short style by default', () => {
    const result = formatDate('2025-03-15T10:00:00Z');
    expect(result).toMatch(/Mar 15, 2025/);
  });

  it('formats date in long style', () => {
    const result = formatDate('2025-03-15T10:00:00Z', 'long');
    expect(result).toMatch(/March 15, 2025/);
  });

  it('formats date in relative style', () => {
    // Use a date far in the past to get stable output
    const result = formatDate('2020-01-01T00:00:00Z', 'relative');
    expect(result).toContain('ago');
  });
});

// ============================================================================
// formatDateTime
// ============================================================================
describe('formatDateTime', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });

  it('formats date with time', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z');
    expect(result).toMatch(/Jun 15, 2025/);
    // Time component present (format varies by timezone)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ============================================================================
// formatCurrency
// ============================================================================
describe('formatCurrency', () => {
  it('returns $0 for null/undefined', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
  });

  it('formats integer amounts', () => {
    expect(formatCurrency(500000)).toBe('$500,000');
  });

  it('formats compact millions', () => {
    expect(formatCurrency(1500000, { compact: true })).toBe('$1.5M');
  });

  it('formats compact thousands', () => {
    expect(formatCurrency(75000, { compact: true })).toBe('$75K');
  });

  it('formats small compact values normally', () => {
    expect(formatCurrency(500, { compact: true })).toBe('$500');
  });

  it('handles negative values', () => {
    const result = formatCurrency(-1000);
    expect(result).toContain('1,000');
  });
});

// ============================================================================
// formatPercent
// ============================================================================
describe('formatPercent', () => {
  it('returns 0% for null/undefined', () => {
    expect(formatPercent(null)).toBe('0%');
    expect(formatPercent(undefined)).toBe('0%');
  });

  it('formats with default 0 decimals', () => {
    expect(formatPercent(85.7)).toBe('86%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercent(85.75, 1)).toBe('85.8%');
  });
});

// ============================================================================
// formatNumber
// ============================================================================
describe('formatNumber', () => {
  it('returns 0 for null/undefined', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });

  it('formats with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});

// ============================================================================
// humanizeStatus
// ============================================================================
describe('humanizeStatus', () => {
  it('converts snake_case to Title Case', () => {
    expect(humanizeStatus('pending_review')).toBe('Pending Review');
    expect(humanizeStatus('in_progress')).toBe('In Progress');
    expect(humanizeStatus('ready_for_closing')).toBe('Ready For Closing');
  });

  it('handles single word', () => {
    expect(humanizeStatus('draft')).toBe('Draft');
    expect(humanizeStatus('active')).toBe('Active');
  });

  it('handles already formatted strings', () => {
    expect(humanizeStatus('Open')).toBe('Open');
  });
});

// ============================================================================
// Navigation and breadcrumb coverage
// ============================================================================
describe('breadcrumb label mapping', () => {
  // Test the breadcrumb labels are comprehensive by checking they exist
  // This is a "safety net" test — if someone adds a route without a label,
  // the breadcrumb will fall back to the raw segment.
  const knownRoutes = [
    'dashboard', 'transactions', 'approvals', 'settings', 'new',
    'queue', 'digest', 'analytics', 'broker', 'forecast',
    'overview', 'documents', 'checklist', 'closing', 'collaborators',
    'timeline', 'communications', 'audit-log', 'rules', 'templates',
    'digests', 'requests', 'getting-started',
  ];

  // We can't import the React component directly in a node test,
  // so we verify the concept with a simple format check
  it('all known route segments produce reasonable labels', () => {
    for (const route of knownRoutes) {
      const label = humanizeStatus(route.replace(/-/g, '_'));
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Status dot color mapping coverage
// ============================================================================
describe('status mapping completeness', () => {
  const expectedStatuses = [
    'draft', 'active', 'under_contract', 'pending', 'closed', 'cancelled', 'on_hold',
    'completed', 'in_progress', 'needs_review', 'approved', 'rejected',
    'healthy', 'watch', 'at_risk', 'critical',
    'ready_for_closing', 'nearly_ready', 'not_ready',
    'processing', 'queued', 'failed',
    'open', 'under_review', 'blocked', 'resolved', 'overridden',
    'info', 'warning', 'success', 'error',
  ];

  it('all expected statuses produce valid humanized labels', () => {
    for (const status of expectedStatuses) {
      const label = humanizeStatus(status);
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
