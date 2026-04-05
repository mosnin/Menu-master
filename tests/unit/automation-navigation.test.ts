import { describe, expect, it } from 'vitest';
import { AUTOMATION_NAV_ITEMS } from '@/lib/ui/automation-nav-items';

describe('automation navigation information architecture', () => {
  it('includes core cross-layer surfaces in predictable order', () => {
    expect(AUTOMATION_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Builder',
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
});
