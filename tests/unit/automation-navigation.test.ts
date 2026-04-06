import { describe, expect, it } from 'vitest';
import { AUTOMATION_NAV_ITEMS } from '@/lib/ui/automation-nav-items';

describe('automation navigation information architecture', () => {
  it('includes all cross-layer surfaces in correct order', () => {
    expect(AUTOMATION_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Builder',
      'Runs',
      'Governance',
      'Library',
      'Setup',
      'Success',
      'ROI',
    ]);
  });

  it('keeps all nav hrefs within ops scope', () => {
    expect(AUTOMATION_NAV_ITEMS.every((item) => item.href.startsWith('/ops/'))).toBe(true);
  });

  it('includes workflow runs surface', () => {
    const hasRuns = AUTOMATION_NAV_ITEMS.some((item) => item.href === '/ops/workflow-runs');
    expect(hasRuns).toBe(true);
  });

  it('has no duplicate hrefs', () => {
    const hrefs = AUTOMATION_NAV_ITEMS.map((item) => item.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it('has no duplicate labels', () => {
    const labels = AUTOMATION_NAV_ITEMS.map((item) => item.label);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });
});
