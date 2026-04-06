import { describe, expect, it } from 'vitest';
import { toStatusLabel, toStatusTone } from '@/lib/ui/automation-status';

describe('automation status language consistency', () => {
  it('maps known states to consistent tones', () => {
    expect(toStatusTone('released')).toBe('default');
    expect(toStatusTone('blocked')).toBe('destructive');
    expect(toStatusTone('ready_for_review')).toBe('outline');
  });

  it('normalizes unknown states safely and formats labels', () => {
    expect(toStatusTone('custom_state')).toBe('outline');
    expect(toStatusLabel('ready_for_activation')).toBe('Ready For Activation');
  });

  it('covers required cross-layer state vocabulary', () => {
    const required = [
      'draft',
      'validated',
      'simulated',
      'ready_for_review',
      'approved_for_release',
      'released',
      'staged',
      'paused',
      'rolled_back',
      'blocked',
      'degraded',
      'incident',
      'attested',
      'low_value',
      'high_risk',
    ];

    for (const state of required) {
      expect(toStatusTone(state)).toBeTruthy();
      expect(toStatusLabel(state).length).toBeGreaterThan(0);
    }
  });
});
