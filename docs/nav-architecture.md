# Navigation Architecture

## File Location

`components/layout/sidebar.tsx` — single source of truth for all navigation.

## Nav Tree

Role visibility: **A** = agent, **C** = coordinator, **B** = broker_admin  
`*` = exact match only (not prefix)

### Work (all roles: A, C, B)

| Label | Route | Icon | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard | |
| Inbox | `/inbox` | InboxIcon | |
| Queue | `/queue` | Inbox | |
| Digest | `/digest` | Newspaper | |
| Transactions | `/transactions` | FileText | |
| Listings | `/listings` | Home | |
| Approvals | `/approvals` | CheckSquare | badge (pending count) |

### Automation (C, B only — coordinator+)

| Label | Route | Notes |
|---|---|---|
| Overview * | `/ops` | exact match — hub page with all sub-area cards |
| Workflows | `/ops/workflows` | |
| Runs | `/ops/workflow-runs` | |
| Governance | `/ops/automation-governance` | |
| Library | `/ops/automation-library` | |
| Setup | `/ops/automation-setup` | |
| Success | `/ops/automation-success` | |
| ROI | `/ops/automation-economics` | |

### Broker (B only — broker_admin)

| Label | Route | Notes |
|---|---|---|
| Overview * | `/broker` | exact match |
| Forecast | `/broker/forecast` | |
| Compliance | `/broker/compliance` | |
| Analytics | `/analytics` | requires broker_admin (role-gated in page) |

### Admin (B only — broker_admin)

| Label | Route | Notes |
|---|---|---|
| Overview * | `/admin` | exact match |
| Imports | `/admin/imports` | |
| Duplicates | `/admin/duplicates` | |
| Diagnostics | `/admin/diagnostics` | |

### Settings (all roles; Policies is B only)

| Label | Route | Notes |
|---|---|---|
| Overview * | `/settings` | exact match |
| Rules | `/settings/rules` | |
| Templates | `/settings/templates` | |
| Digest Prefs | `/settings/digests` | |
| Policies | `/settings/policies` | B only (`adminOnly: true`) |
| Getting Started | `/getting-started` | setup guide, all roles |

---

## AutomationNav Horizontal Tab Bar

All `/ops/*` top-level pages render `<AutomationNav />` from `components/ops/automation-nav.tsx`.  
Tabs are defined in `lib/ui/automation-nav-items.ts`:

| Label | Route |
|---|---|
| Builder | `/ops/workflows` |
| Runs | `/ops/workflow-runs` |
| Governance | `/ops/automation-governance` |
| Library | `/ops/automation-library` |
| Setup | `/ops/automation-setup` |
| Success | `/ops/automation-success` |
| ROI | `/ops/automation-economics` |

The `/ops/` overview page does **not** render AutomationNav (it is the overview itself).  
Workflow detail pages (`/ops/workflows/[id]/*`) do not render AutomationNav — they use their own layout.

---

## Key Types

```typescript
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;       // use for routes that are also route prefixes
  adminOnly?: boolean;   // broker_admin only within a section
  showBadge?: boolean;   // show pending-count badge
}
```

## Route Matching

```typescript
function matchesRoute(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
```

Always add `exact: true` to routes that are parents of other routes (e.g. `/broker`, `/admin`, `/settings`, `/ops`).

## Section Auto-Open Logic

Collapsible sections auto-open when the current pathname falls under their prefix:

```typescript
const inAutomation = pathname === '/ops' || pathname.startsWith('/ops/');
const inBroker     = pathname.startsWith('/broker') || pathname.startsWith('/analytics');
const inAdmin      = pathname.startsWith('/admin');
const inSettings   = pathname.startsWith('/settings');
```

## Mobile Navigation

`MobileSidebarSheet` (exported as `MobileSidebar`) — a Radix `Sheet` that opens from the left. Triggered by the hamburger button in `Header` via `onMobileMenuToggle` prop on the authenticated layout.

The mobile nav renders `MobileSectionGroup` components per section — same role filtering and route matching as desktop. Each section auto-opens if any item in it `matchesRoute` the current pathname. `useEffect` re-evaluates `open` whenever `pathname` or `hasActive` changes.

---

## Intentionally Hidden Routes (reachable via other means)

| Route | How to reach |
|---|---|
| `/notifications` | Notification bell "View all" button in header |
| `/seller-portal` | Direct link from listing/invite (external sellers) |
| `/onboarding` | Auto-redirect from layout if membership missing or onboarding pending |
| `/ops/workflows/[id]` | Click on a workflow row in `/ops/workflows` |
| `/ops/workflow-runs/[runId]` | Click on a run row in `/ops/workflow-runs` |
| `/transactions/[id]/*` | Click on a transaction row |
| `/listings/[id]/*` | Click on a listing row |
| `/admin/imports/new` | Button inside `/admin/imports` |

---

## Adding a New Nav Item

1. Add the route to the appropriate `*Nav` array in `sidebar.tsx`
2. Add the matching label to `breadcrumbLabels` in `header.tsx`
3. Create the `app/(authenticated)/your-route/page.tsx`
4. If it's a new ops sub-page, add to `AUTOMATION_NAV_ITEMS` in `lib/ui/automation-nav-items.ts` and render `<AutomationNav />` in the page
5. Update `tests/unit/automation-navigation.test.ts` if you changed `AUTOMATION_NAV_ITEMS`

## Adding a New Section

1. Create a new `NavItem[]` array
2. Add a `NavSection` component call in both `DesktopSidebar` and `MobileSidebar` (`MobileSectionGroup`)
3. Add the `inYourSection` boolean derived from `pathname`
4. Update this doc

## Verification

Run nav correctness tests:

```bash
npx vitest run tests/unit/nav-correctness.test.ts tests/unit/automation-navigation.test.ts
```

These cover:
- `matchesRoute` exact vs prefix logic
- No duplicate hrefs across full nav
- Role visibility correctness
- Section auto-open logic
- AutomationNav tab coverage (sidebar ↔ tab bar parity)
- Deep link section context (e.g. `/ops/workflows/[id]/edit` still highlights Workflows)
- Dashboard outbound links are reachable
