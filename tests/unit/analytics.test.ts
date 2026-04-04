import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase client — every module under lib/analytics imports it
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock('@/lib/db/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Silence logger during tests
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import {
  EVENT_TAXONOMY,
  trackEvent,
  trackEvents,
  type AnalyticsEventCategory,
  type AnalyticsEventName,
} from '@/lib/analytics/events';
import {
  MILESTONES,
  recordMilestone,
  getMilestones,
  getActivationFunnel,
} from '@/lib/analytics/milestones';
import {
  submitFeedback,
  getFeedbackSummary,
  getRecentFeedback,
} from '@/lib/analytics/feedback';
import { getOrgMetrics } from '@/lib/analytics/metrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Supabase query-builder chain that resolves to `data` / `error`. */
function mockQuery(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  ['select', 'insert', 'upsert', 'eq', 'in', 'gte', 'not', 'order', 'limit', 'single'].forEach(
    (m) => { chain[m] = vi.fn(self); }
  );
  // Terminal — when awaited, resolve to { data, error }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error });
  return chain;
}

function setupFrom(map: Record<string, ReturnType<typeof mockQuery>>) {
  mockFrom.mockImplementation((table: string) => map[table] ?? mockQuery());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. Event taxonomy validation
// ===========================================================================
describe('Event taxonomy', () => {
  const categories = Object.keys(EVENT_TAXONOMY) as AnalyticsEventCategory[];

  it('has at least one event in every category', () => {
    for (const cat of categories) {
      expect(EVENT_TAXONOMY[cat].length).toBeGreaterThan(0);
    }
  });

  it('contains no duplicate event names across all categories', () => {
    const all: string[] = [];
    for (const cat of categories) {
      all.push(...EVENT_TAXONOMY[cat]);
    }
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it('has the expected top-level categories', () => {
    const expected = [
      'activation', 'transaction', 'document', 'extraction', 'correction',
      'completeness', 'queue', 'approval', 'communication', 'recommendation',
      'exception', 'feedback', 'configuration', 'navigation',
    ];
    expect(categories.sort()).toEqual(expected.sort());
  });

  it('EVENT_TAXONOMY values are readonly arrays of strings', () => {
    for (const cat of categories) {
      for (const evt of EVENT_TAXONOMY[cat]) {
        expect(typeof evt).toBe('string');
      }
    }
  });
});

// ===========================================================================
// 2. trackEvent / trackEvents
// ===========================================================================
describe('trackEvent', () => {
  it('inserts a row into product_events', async () => {
    const insertMock = vi.fn(() => ({ data: null, error: null }));
    mockFrom.mockReturnValue({ insert: insertMock });

    await trackEvent({
      orgId: 'org-1',
      userId: 'user-1',
      event: 'transaction_created',
      category: 'transaction',
      properties: { foo: 'bar' },
    });

    expect(mockFrom).toHaveBeenCalledWith('product_events');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        event_name: 'transaction_created',
        event_category: 'transaction',
      }),
    );
  });

  it('does not throw when insert fails (analytics is non-blocking)', async () => {
    const insertMock = vi.fn(() => ({ data: null, error: { message: 'db down' } }));
    mockFrom.mockReturnValue({ insert: insertMock });

    await expect(
      trackEvent({ event: 'dashboard_viewed', category: 'navigation' }),
    ).resolves.toBeUndefined();
  });
});

describe('trackEvents (batch)', () => {
  it('inserts multiple rows in one call', async () => {
    const insertMock = vi.fn(() => ({ data: null, error: null }));
    mockFrom.mockReturnValue({ insert: insertMock });

    await trackEvents([
      { event: 'queue_viewed', category: 'queue', orgId: 'org-1' },
      { event: 'queue_filtered', category: 'queue', orgId: 'org-1' },
    ]);

    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = (insertMock.mock.calls as any[][])[0][0];
    expect(rows).toHaveLength(2);
  });
});

// ===========================================================================
// 3. Milestone tracking
// ===========================================================================
describe('Milestones', () => {
  it('MILESTONES contains exactly 11 entries', () => {
    expect(MILESTONES).toHaveLength(11);
  });

  it('includes expected milestone names', () => {
    const expected = [
      'first_login',
      'setup_completed',
      'first_transaction',
      'first_document_upload',
      'first_extraction_success',
      'first_correction',
      'first_approval_completed',
      'first_reminder_sent',
      'first_email_connected',
      'first_recommendation_executed',
      'first_live_transaction',
    ];
    expect([...MILESTONES]).toEqual(expected);
  });

  it('recordMilestone upserts into activation_milestones and emits event', async () => {
    const upsertMock = vi.fn(() => ({ data: null, error: null }));
    const insertMock = vi.fn(() => ({ data: null, error: null }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'activation_milestones') return { upsert: upsertMock };
      if (table === 'product_events') return { insert: insertMock };
      return mockQuery();
    });

    const result = await recordMilestone('org-1', 'user-1', 'first_login');
    expect(result).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    // Should also fire trackEvent for the activation event
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('recordMilestone returns false on db error', async () => {
    const upsertMock = vi.fn(() => ({ data: null, error: { message: 'conflict' } }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'activation_milestones') return { upsert: upsertMock };
      return mockQuery();
    });

    const result = await recordMilestone('org-1', null, 'setup_completed');
    expect(result).toBe(false);
  });

  it('getActivationFunnel returns all milestones with achieved status', async () => {
    // getMilestones queries supabase — mock the chain
    const selectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [
          { milestone: 'first_login', achieved_at: '2026-01-01T00:00:00Z' },
          { milestone: 'setup_completed', achieved_at: '2026-01-02T00:00:00Z' },
        ],
        error: null,
      })),
    }));
    mockFrom.mockReturnValue({ select: selectMock });

    const funnel = await getActivationFunnel('org-1');
    expect(funnel).toHaveLength(11);
    expect(funnel[0]).toEqual({
      milestone: 'first_login',
      achieved: true,
      achievedAt: '2026-01-01T00:00:00Z',
    });
    // A milestone not in the DB should be not-achieved
    const notAchieved = funnel.find(m => m.milestone === 'first_correction');
    expect(notAchieved?.achieved).toBe(false);
    expect(notAchieved?.achievedAt).toBeNull();
  });
});

// ===========================================================================
// 4. Feedback service
// ===========================================================================
describe('Feedback', () => {
  it('submitFeedback inserts and tracks event', async () => {
    const selectSingleChain = {
      single: vi.fn(() => ({
        data: { id: 'fb-1', feedback_type: 'thumbs_up' },
        error: null,
      })),
    };
    const selectChain = { select: vi.fn(() => selectSingleChain) };
    const insertMock = vi.fn(() => selectChain);
    const eventInsertMock = vi.fn(() => ({ data: null, error: null }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'product_feedback') return { insert: insertMock };
      if (table === 'product_events') return { insert: eventInsertMock };
      return mockQuery();
    });

    const result = await submitFeedback({
      orgId: 'org-1',
      userId: 'user-1',
      feedbackType: 'thumbs_up',
      featureArea: 'queue',
    });

    expect(result).toEqual(expect.objectContaining({ id: 'fb-1' }));
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(eventInsertMock).toHaveBeenCalledTimes(1);
  });

  it('submitFeedback throws on db error', async () => {
    const selectSingleChain = {
      single: vi.fn(() => ({
        data: null,
        error: { message: 'insert failed' },
      })),
    };
    const selectChain = { select: vi.fn(() => selectSingleChain) };
    const insertMock = vi.fn(() => selectChain);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'product_feedback') return { insert: insertMock };
      return mockQuery();
    });

    await expect(
      submitFeedback({
        orgId: 'org-1',
        userId: 'user-1',
        feedbackType: 'text',
        featureArea: 'extraction',
        body: 'Great feature',
      }),
    ).rejects.toThrow('Failed to submit feedback');
  });

  it('getFeedbackSummary groups by feature area', async () => {
    const eqMock = vi.fn(() => ({
      data: [
        { feature_area: 'queue', feedback_type: 'thumbs_up', rating: 5 },
        { feature_area: 'queue', feedback_type: 'thumbs_down', rating: 2 },
        { feature_area: 'extraction', feedback_type: 'thumbs_up', rating: 4 },
      ],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    mockFrom.mockReturnValue({ select: selectMock });

    const summary = await getFeedbackSummary('org-1');
    expect(summary).toEqual({
      queue: { thumbs_up: 1, thumbs_down: 1, total: 2 },
      extraction: { thumbs_up: 1, thumbs_down: 0, total: 1 },
    });
  });
});

// ===========================================================================
// 5. Metrics — test indirectly through getOrgMetrics
// ===========================================================================
describe('getOrgMetrics', () => {
  it('returns structured metrics with countBy and turnaround computed', async () => {
    // Build a mock that returns different data per table
    const tableData: Record<string, unknown[]> = {
      transactions: [
        { status: 'active' },
        { status: 'active' },
        { status: 'draft' },
      ],
      documents: [
        { processing_status: 'completed' },
        { processing_status: 'pending' },
      ],
      approvals: [
        {
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
          decided_at: '2026-01-01T02:00:00Z',
        },
        {
          status: 'pending',
          created_at: '2026-01-02T00:00:00Z',
          decided_at: null,
        },
      ],
      transaction_exceptions: [
        { severity: 'high', resolution_status: 'open', exception_type: 'missing_doc' },
      ],
      transaction_recommendations: [
        { status: 'executed', action_type: 'send_reminder' },
        { status: 'dismissed', action_type: 'add_doc' },
      ],
      field_corrections: [{ id: 'c1', created_at: '2026-01-01', field_value_id: 'fv1' }],
      transaction_completeness: [
        { completeness_score: 80, readiness_state: 'ready' },
        { completeness_score: 60, readiness_state: 'not_ready' },
      ],
      product_feedback: [
        { feedback_type: 'thumbs_up', feature_area: 'queue', rating: 5 },
      ],
    };

    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      ['select', 'eq', 'in', 'limit'].forEach((m) => { chain[m] = vi.fn(self); });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: tableData[table] ?? [], error: null });
      return chain;
    });

    const metrics = await getOrgMetrics('org-1');

    // Transactions — countBy
    expect(metrics.transactions.total).toBe(3);
    expect(metrics.transactions.byStatus).toEqual({ active: 2, draft: 1 });

    // Documents
    expect(metrics.documents.total).toBe(2);

    // Approvals — avg turnaround (only 1 decided: 2h = 7200000ms)
    expect(metrics.approvals.avgTurnaroundMs).toBe(7_200_000);

    // Recommendations — execution / dismiss rates
    expect(metrics.recommendations.executionRate).toBe(0.5);
    expect(metrics.recommendations.dismissRate).toBe(0.5);

    // Feedback
    expect(metrics.feedback.thumbsUp).toBe(1);
  });

  it('handles empty data gracefully (turnaround returns null)', async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      ['select', 'eq', 'in', 'limit'].forEach((m) => { chain[m] = vi.fn(self); });
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null });
      return chain;
    });

    const metrics = await getOrgMetrics('org-1');
    expect(metrics.approvals.avgTurnaroundMs).toBeNull();
    expect(metrics.transactions.total).toBe(0);
    expect(metrics.recommendations.executionRate).toBe(0);
  });
});
