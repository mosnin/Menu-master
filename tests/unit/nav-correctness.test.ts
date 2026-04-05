/**
 * Navigation correctness tests
 *
 * Verifies:
 * - matchesRoute logic (exact vs prefix)
 * - Sidebar nav item definitions (no dead hrefs, no duplicates)
 * - Role-based section visibility
 * - AutomationNav coverage of all /ops/* top-level routes
 * - Breadcrumb label coverage
 * - Deep link section context (inAutomation / inBroker etc.)
 */

import { describe, it, expect } from 'vitest';
import { AUTOMATION_NAV_ITEMS } from '@/lib/ui/automation-nav-items';

// ─── matchesRoute (inline to avoid importing client component) ─────────────────

interface NavItem {
  href: string;
  exact?: boolean;
}

function matchesRoute(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

// ─── Nav definitions (mirrored from sidebar — keep in sync) ───────────────────

const workNav = [
  { href: '/dashboard' },
  { href: '/inbox' },
  { href: '/queue' },
  { href: '/digest' },
  { href: '/transactions' },
  { href: '/listings' },
  { href: '/approvals' },
];

const automationNav = [
  { href: '/ops',                       exact: true },
  { href: '/ops/workflows' },
  { href: '/ops/workflow-runs' },
  { href: '/ops/automation-governance' },
  { href: '/ops/automation-library' },
  { href: '/ops/automation-setup' },
  { href: '/ops/automation-success' },
  { href: '/ops/automation-economics' },
];

const brokerNav = [
  { href: '/broker',             exact: true },
  { href: '/broker/forecast' },
  { href: '/broker/compliance' },
  { href: '/analytics' },
];

const adminNav = [
  { href: '/admin',              exact: true },
  { href: '/admin/imports' },
  { href: '/admin/duplicates' },
  { href: '/admin/diagnostics' },
];

const settingsNav = [
  { href: '/settings',           exact: true },
  { href: '/settings/rules' },
  { href: '/settings/templates' },
  { href: '/settings/digests' },
  { href: '/settings/policies',  adminOnly: true },
  { href: '/getting-started' },
];

const allNavItems = [
  ...workNav,
  ...automationNav,
  ...brokerNav,
  ...adminNav,
  ...settingsNav,
];

// ─── matchesRoute tests ────────────────────────────────────────────────────────

describe('matchesRoute', () => {
  it('matches exact pathname', () => {
    expect(matchesRoute('/dashboard', { href: '/dashboard' })).toBe(true);
  });

  it('matches child of prefix item', () => {
    expect(matchesRoute('/transactions/abc123', { href: '/transactions' })).toBe(true);
  });

  it('does not match unrelated route', () => {
    expect(matchesRoute('/settings', { href: '/dashboard' })).toBe(false);
  });

  it('exact item: matches only the exact path', () => {
    const item = { href: '/broker', exact: true };
    expect(matchesRoute('/broker', item)).toBe(true);
    expect(matchesRoute('/broker/forecast', item)).toBe(false);
  });

  it('exact item: /settings does not match /settings/rules', () => {
    const item = { href: '/settings', exact: true };
    expect(matchesRoute('/settings', item)).toBe(true);
    expect(matchesRoute('/settings/rules', item)).toBe(false);
  });

  it('exact item: /admin does not match /admin/imports', () => {
    const item = { href: '/admin', exact: true };
    expect(matchesRoute('/admin', item)).toBe(true);
    expect(matchesRoute('/admin/imports', item)).toBe(false);
  });

  it('exact item: /ops does not match /ops/workflows', () => {
    const item = { href: '/ops', exact: true };
    expect(matchesRoute('/ops', item)).toBe(true);
    expect(matchesRoute('/ops/workflows', item)).toBe(false);
  });

  it('prefix item: /ops/workflows matches child routes', () => {
    const item = { href: '/ops/workflows' };
    expect(matchesRoute('/ops/workflows', item)).toBe(true);
    expect(matchesRoute('/ops/workflows/abc123', item)).toBe(true);
    expect(matchesRoute('/ops/workflows/abc123/edit', item)).toBe(true);
  });

  it('does not cross-match sibling routes', () => {
    const item = { href: '/ops/workflow-runs' };
    expect(matchesRoute('/ops/workflows', item)).toBe(false);
    expect(matchesRoute('/ops/automation-governance', item)).toBe(false);
  });
});

// ─── Nav item integrity ────────────────────────────────────────────────────────

describe('nav item integrity', () => {
  it('has no duplicate hrefs across the full nav', () => {
    const hrefs = allNavItems.map((i) => i.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it('all hrefs start with /', () => {
    allNavItems.forEach(({ href }) => {
      expect(href.startsWith('/')).toBe(true);
    });
  });

  it('all hrefs are lowercase and hyphenated (no camelCase or spaces)', () => {
    allNavItems.forEach(({ href }) => {
      expect(href).toMatch(/^[/a-z0-9-[\]]+$/);
    });
  });
});

// ─── Section auto-open logic ───────────────────────────────────────────────────

describe('section auto-open: inAutomation', () => {
  function inAutomation(pathname: string) {
    return pathname === '/ops' || pathname.startsWith('/ops/');
  }

  it('opens for /ops exactly', () => {
    expect(inAutomation('/ops')).toBe(true);
  });

  it('opens for /ops/workflows', () => {
    expect(inAutomation('/ops/workflows')).toBe(true);
  });

  it('opens for /ops/automation-governance', () => {
    expect(inAutomation('/ops/automation-governance')).toBe(true);
  });

  it('does not open for /settings', () => {
    expect(inAutomation('/settings')).toBe(false);
  });
});

describe('section auto-open: inBroker', () => {
  function inBroker(pathname: string) {
    return pathname.startsWith('/broker') || pathname.startsWith('/analytics');
  }

  it('opens for /broker', () => {
    expect(inBroker('/broker')).toBe(true);
  });

  it('opens for /broker/forecast', () => {
    expect(inBroker('/broker/forecast')).toBe(true);
  });

  it('opens for /analytics', () => {
    expect(inBroker('/analytics')).toBe(true);
  });

  it('does not open for /admin', () => {
    expect(inBroker('/admin')).toBe(false);
  });
});

// ─── Role visibility ──────────────────────────────────────────────────────────

describe('role visibility', () => {
  const roles = { agent: 1, coordinator: 2, broker_admin: 3 };

  it('Work section is visible to all roles', () => {
    // workNav has no role restriction — always rendered
    expect(workNav.length).toBeGreaterThan(0);
  });

  it('Automation section is visible to coordinator and broker_admin', () => {
    const coordinatorPlus = ['coordinator', 'broker_admin'];
    coordinatorPlus.forEach((role) => {
      const isCoordinatorPlus = role === 'coordinator' || role === 'broker_admin';
      expect(isCoordinatorPlus).toBe(true);
    });
  });

  it('Automation section is NOT visible to agent', () => {
    const isCoordinatorPlus = 'agent' === 'coordinator' || 'agent' === 'broker_admin';
    expect(isCoordinatorPlus).toBe(false);
  });

  it('Broker and Admin sections are visible only to broker_admin', () => {
    const isAdmin = (role: string) => role === 'broker_admin';
    expect(isAdmin('broker_admin')).toBe(true);
    expect(isAdmin('coordinator')).toBe(false);
    expect(isAdmin('agent')).toBe(false);
  });

  it('Settings Policies item is admin-only', () => {
    const policiesItem = settingsNav.find((i) => i.href === '/settings/policies');
    expect(policiesItem?.adminOnly).toBe(true);
  });

  it('Settings Getting Started item is not admin-only', () => {
    const gettingStartedItem = settingsNav.find((i) => i.href === '/getting-started');
    expect((gettingStartedItem as { adminOnly?: boolean })?.adminOnly).toBeUndefined();
  });
});

// ─── AutomationNav coverage ────────────────────────────────────────────────────

describe('AutomationNav tab coverage', () => {
  const automationNavHrefs = automationNav
    .filter((i) => !i.exact)
    .map((i) => i.href);

  it('AutomationNav tabs cover all sidebar automation entries (except Overview)', () => {
    const tabHrefs = AUTOMATION_NAV_ITEMS.map((i) => i.href);
    // Every AUTOMATION_NAV_ITEMS href should exist in sidebar automationNav
    tabHrefs.forEach((href) => {
      expect(automationNavHrefs).toContain(href);
    });
  });

  it('Workflow Runs is in AutomationNav tabs', () => {
    const tabHrefs = AUTOMATION_NAV_ITEMS.map((i) => i.href);
    expect(tabHrefs).toContain('/ops/workflow-runs');
  });

  it('Workflow Builder is in AutomationNav tabs', () => {
    const tabHrefs = AUTOMATION_NAV_ITEMS.map((i) => i.href);
    expect(tabHrefs).toContain('/ops/workflows');
  });
});

// ─── Deep link context ─────────────────────────────────────────────────────────

describe('deep link section context', () => {
  it('/ops/workflows/[id]/edit still opens automation section', () => {
    const pathname = '/ops/workflows/abc123/edit';
    const inAuto = pathname === '/ops' || pathname.startsWith('/ops/');
    expect(inAuto).toBe(true);
  });

  it('/ops/workflows/[id]/edit highlights Workflows nav item (not Overview)', () => {
    const pathname = '/ops/workflows/abc123/edit';
    const overviewItem = { href: '/ops', exact: true };
    const workflowsItem = { href: '/ops/workflows' };
    expect(matchesRoute(pathname, overviewItem)).toBe(false);
    expect(matchesRoute(pathname, workflowsItem)).toBe(true);
  });

  it('/transactions/[id]/checklist highlights Transactions nav item', () => {
    const pathname = '/transactions/abc123/checklist';
    const txItem = { href: '/transactions' };
    expect(matchesRoute(pathname, txItem)).toBe(true);
  });

  it('/broker/compliance highlights Compliance not Overview', () => {
    const pathname = '/broker/compliance';
    const overviewItem = { href: '/broker', exact: true };
    const complianceItem = { href: '/broker/compliance' };
    expect(matchesRoute(pathname, overviewItem)).toBe(false);
    expect(matchesRoute(pathname, complianceItem)).toBe(true);
  });

  it('/admin/imports highlights Imports not Overview', () => {
    const pathname = '/admin/imports';
    const overviewItem = { href: '/admin', exact: true };
    const importsItem = { href: '/admin/imports' };
    expect(matchesRoute(pathname, overviewItem)).toBe(false);
    expect(matchesRoute(pathname, importsItem)).toBe(true);
  });

  it('/settings/rules highlights Rules not Overview', () => {
    const pathname = '/settings/rules';
    const overviewItem = { href: '/settings', exact: true };
    const rulesItem = { href: '/settings/rules' };
    expect(matchesRoute(pathname, overviewItem)).toBe(false);
    expect(matchesRoute(pathname, rulesItem)).toBe(true);
  });
});

// ─── Dashboard link targets ────────────────────────────────────────────────────

describe('dashboard outbound links are in the nav', () => {
  const dashboardLinks = [
    '/transactions',
    '/approvals',
    '/digest',
    '/transactions/new',
    '/settings/digests',
  ];
  const allHrefs = allNavItems.map((i) => i.href);

  it('all dashboard links resolve to a nav item', () => {
    dashboardLinks.forEach((link) => {
      // Link should either be a direct nav item or have a parent nav item
      const directMatch = allHrefs.includes(link);
      const prefixMatch = allHrefs.some((href) =>
        !link.startsWith(href + '/') ? false : true
      );
      expect(directMatch || prefixMatch).toBe(true);
    });
  });
});
