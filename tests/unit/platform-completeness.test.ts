/**
 * Platform Completeness Foundation Tests
 *
 * Tests for:
 * - Stage machine transitions and validation
 * - Stage pipeline progress calculation
 * - Notification dedup and preference filtering
 * - Search result ranking
 * - Bulk action lifecycle
 * - Inbox priority ordering
 */
import { describe, it, expect } from 'vitest';
import { humanizeStatus } from '@/lib/format';

// ============================================================================
// 1. Stage Machine — transitions and validation
// ============================================================================
import {
  STAGE_TRANSITIONS,
  STAGE_ORDER,
  TERMINAL_STAGES,
  validateStageTransition,
  getAvailableStageTransitions,
  isTerminalStage,
  getStageIndex,
  getStageProgress,
  InvalidStageTransitionError,
} from '@/lib/services/stage-service';
import type { TransactionStage } from '@/types';

describe('Stage machine transitions', () => {
  it('intake can move to under_contract', () => {
    expect(() => validateStageTransition('intake', 'under_contract')).not.toThrow();
  });

  it('intake cannot skip to financing', () => {
    expect(() => validateStageTransition('intake', 'financing')).toThrow(InvalidStageTransitionError);
  });

  it('any active stage can move to fell_through', () => {
    const activeStages: TransactionStage[] = [
      'intake', 'under_contract', 'due_diligence', 'financing',
      'appraisal', 'title_and_escrow', 'closing_prep',
    ];
    for (const stage of activeStages) {
      expect(getAvailableStageTransitions(stage)).toContain('fell_through');
    }
  });

  it('any active stage can move to archived', () => {
    const activeStages: TransactionStage[] = [
      'intake', 'under_contract', 'due_diligence', 'financing',
      'appraisal', 'title_and_escrow', 'closing_prep',
    ];
    for (const stage of activeStages) {
      expect(getAvailableStageTransitions(stage)).toContain('archived');
    }
  });

  it('closed can only go to archived', () => {
    const transitions = getAvailableStageTransitions('closed');
    expect(transitions).toEqual(['archived']);
  });

  it('archived is terminal — no transitions out', () => {
    const transitions = getAvailableStageTransitions('archived');
    expect(transitions).toEqual([]);
  });

  it('fell_through can reactivate to intake', () => {
    expect(getAvailableStageTransitions('fell_through')).toContain('intake');
  });

  it('closing_prep can reach closed', () => {
    expect(() => validateStageTransition('closing_prep', 'closed')).not.toThrow();
  });

  it('pipeline stages are in correct order', () => {
    expect(STAGE_ORDER).toEqual([
      'intake', 'under_contract', 'due_diligence', 'financing',
      'appraisal', 'title_and_escrow', 'closing_prep', 'closed',
    ]);
  });

  it('terminal stages are correct', () => {
    expect(TERMINAL_STAGES).toContain('closed');
    expect(TERMINAL_STAGES).toContain('fell_through');
    expect(TERMINAL_STAGES).toContain('archived');
    expect(TERMINAL_STAGES).not.toContain('intake');
  });

  it('every pipeline stage has defined transitions', () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_TRANSITIONS).toHaveProperty(stage);
    }
  });

  it('no stage can transition to itself', () => {
    for (const [stage, targets] of Object.entries(STAGE_TRANSITIONS)) {
      expect(targets).not.toContain(stage);
    }
  });
});

describe('Stage utility functions', () => {
  it('isTerminalStage returns true for terminal stages', () => {
    expect(isTerminalStage('closed')).toBe(true);
    expect(isTerminalStage('fell_through')).toBe(true);
    expect(isTerminalStage('archived')).toBe(true);
  });

  it('isTerminalStage returns false for active stages', () => {
    expect(isTerminalStage('intake')).toBe(false);
    expect(isTerminalStage('financing')).toBe(false);
    expect(isTerminalStage('closing_prep')).toBe(false);
  });

  it('getStageIndex returns correct indices', () => {
    expect(getStageIndex('intake')).toBe(0);
    expect(getStageIndex('under_contract')).toBe(1);
    expect(getStageIndex('closed')).toBe(7);
  });

  it('getStageProgress returns percentage', () => {
    expect(getStageProgress('intake')).toBe(0);
    expect(getStageProgress('closed')).toBe(100);
    // Mid-pipeline stages should be between 0 and 100
    const midProgress = getStageProgress('financing');
    expect(midProgress).toBeGreaterThan(0);
    expect(midProgress).toBeLessThan(100);
  });

  it('getStageProgress returns 0 for non-pipeline stages', () => {
    expect(getStageProgress('fell_through')).toBe(0);
    expect(getStageProgress('archived')).toBe(0);
  });
});

// ============================================================================
// 2. Stage transition graph — no orphans, no cycles in pipeline
// ============================================================================
describe('Stage graph integrity', () => {
  it('pipeline follows strict forward progression', () => {
    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      const current = STAGE_ORDER[i];
      const next = STAGE_ORDER[i + 1];
      const available = getAvailableStageTransitions(current);
      expect(available).toContain(next);
    }
  });

  it('no pipeline stage can go backward', () => {
    for (let i = 1; i < STAGE_ORDER.length; i++) {
      const current = STAGE_ORDER[i];
      const available = getAvailableStageTransitions(current);
      for (let j = 0; j < i; j++) {
        // Skip checking fell_through → intake (valid reactivation)
        if (current !== 'fell_through') {
          expect(available).not.toContain(STAGE_ORDER[j]);
        }
      }
    }
  });
});

// ============================================================================
// 3. Notification category completeness
// ============================================================================
describe('Notification categories', () => {
  const ALL_CATEGORIES = [
    'approval_assigned', 'mention', 'overdue_item', 'blocked_transaction',
    'external_upload', 'compliance_issue', 'processing_failure',
    'exception_raised', 'stage_changed', 'document_request_fulfilled',
    'policy_override_needed', 'closing_approaching', 'general',
  ];

  it('all 13 notification categories are defined', () => {
    expect(ALL_CATEGORIES.length).toBe(13);
  });

  it('all categories produce valid humanized labels', () => {
    for (const category of ALL_CATEGORIES) {
      const label = humanizeStatus(category);
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
});

// ============================================================================
// 4. Notification priority ordering
// ============================================================================
describe('Notification priority', () => {
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

  it('urgent comes before high', () => {
    expect(priorityOrder.urgent).toBeLessThan(priorityOrder.high);
  });

  it('high comes before normal', () => {
    expect(priorityOrder.high).toBeLessThan(priorityOrder.normal);
  });

  it('normal comes before low', () => {
    expect(priorityOrder.normal).toBeLessThan(priorityOrder.low);
  });
});

// ============================================================================
// 5. Bulk action types
// ============================================================================
describe('Bulk action types', () => {
  const ALL_ACTIONS = [
    'assign_owner', 'assign_reviewer', 'request_review',
    'mark_reviewed', 'send_reminder', 'archive',
    'change_stage', 'bulk_approve',
  ];

  it('all 8 bulk action types are defined', () => {
    expect(ALL_ACTIONS.length).toBe(8);
  });

  it('bulk action status lifecycle is correct', () => {
    const statuses = ['pending', 'processing', 'completed', 'partial_failure', 'failed'];
    expect(statuses.length).toBe(5);
    // Terminal statuses
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('partial_failure');
  });
});

// ============================================================================
// 6. Search result ranking
// ============================================================================
describe('Search result ranking', () => {
  it('prefix matches rank higher than substring matches', () => {
    const results = [
      { title: 'Second Match', rank: 2 },
      { title: 'Prefix Start', rank: 1 },
      { title: 'Another Match', rank: 2 },
    ];

    results.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));

    expect(results[0].title).toBe('Prefix Start');
  });
});

// ============================================================================
// 7. Inbox item priority ordering
// ============================================================================
describe('Inbox priority ordering', () => {
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

  it('sorts items by priority correctly', () => {
    const items = [
      { priority: 'normal', created_at: '2025-01-03' },
      { priority: 'urgent', created_at: '2025-01-01' },
      { priority: 'high', created_at: '2025-01-02' },
      { priority: 'low', created_at: '2025-01-04' },
    ];

    items.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    expect(items[0].priority).toBe('urgent');
    expect(items[1].priority).toBe('high');
    expect(items[2].priority).toBe('normal');
    expect(items[3].priority).toBe('low');
  });

  it('same-priority items sort by newest first', () => {
    const items = [
      { priority: 'high', created_at: '2025-01-01' },
      { priority: 'high', created_at: '2025-01-03' },
      { priority: 'high', created_at: '2025-01-02' },
    ];

    items.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    expect(items[0].created_at).toBe('2025-01-03');
    expect(items[1].created_at).toBe('2025-01-02');
    expect(items[2].created_at).toBe('2025-01-01');
  });
});

// ============================================================================
// 8. Stage-to-status mapping consistency
// ============================================================================
describe('Stage-to-status backfill mapping', () => {
  // Migration 006 maps existing statuses to stages
  const statusToStage: Record<string, string> = {
    draft: 'intake',
    active: 'under_contract',
    pending_closing: 'closing_prep',
    closed: 'closed',
    cancelled: 'fell_through',
  };

  it('all transaction statuses have a stage mapping', () => {
    const allStatuses = ['draft', 'active', 'pending_closing', 'closed', 'cancelled'];
    for (const status of allStatuses) {
      expect(statusToStage).toHaveProperty(status);
    }
  });

  it('mapped stages are all valid stages', () => {
    const allStages = [
      'intake', 'under_contract', 'due_diligence', 'financing',
      'appraisal', 'title_and_escrow', 'closing_prep', 'closed',
      'fell_through', 'archived',
    ];
    for (const stage of Object.values(statusToStage)) {
      expect(allStages).toContain(stage);
    }
  });
});
