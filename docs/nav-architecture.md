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

### Automation (C, B only — minRole: 2)

| Label | Route | Icon |
|---|---|---|
| Workflows | `/ops/workflows` | GitBranch |
| Runs | `/ops/workflow-runs` | Play |
| Governance | `/ops/automation-governance` | Shield |
| Library | `/ops/automation-library` | Library |
| Setup | `/ops/automation-setup` | Cpu |
| Success | `/ops/automation-success` | Award |
| ROI | `/ops/automation-economics` | DollarSign |

### Broker (B only — minRole: 3)

| Label | Route | Notes |
|---|---|---|
| Overview * | `/broker` | exact match |
| Forecast | `/broker/forecast` | |
| Compliance | `/broker/compliance` | |
| Analytics | `/analytics` | |

### Admin (B only — minRole: 3)

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
| Policies | `/settings/policies` | B only |

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
  minRole?: number;      // 1=agent, 2=coordinator, 3=broker_admin
}
```

## Route Matching

```typescript
function matchesRoute(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
```

Items WITHOUT `exact: true` highlight if the current route starts with their href. Always add `exact: true` to routes that are parents of other routes (e.g. `/broker`, `/admin`, `/settings`).

## Section Auto-Open Logic

Collapsible sections auto-open when the current pathname falls under their prefix:

```typescript
const inAutomation = pathname.startsWith('/ops/');
const inBroker     = pathname.startsWith('/broker') || pathname.startsWith('/analytics');
const inAdmin      = pathname.startsWith('/admin');
const inSettings   = pathname.startsWith('/settings');
```

## Mobile Navigation

`MobileSidebarSheet` (exported as `MobileSidebar`) — a Radix `Sheet` that opens from the left. Triggered by the hamburger button in `Header` via `onMobileMenuToggle` prop on the authenticated layout.

The mobile nav renders `MobileSectionGroup` components per section — same role filtering and route matching as desktop.

---

## Adding a New Nav Item

1. Add the route to the appropriate `*Nav` array in `sidebar.tsx`
2. Add the matching label to `breadcrumbLabels` in `header.tsx`
3. Create the `app/(authenticated)/your-route/page.tsx`
4. If it's a new section, add the `inYourSection` auto-open variable

## Adding a New Section

1. Create a new `NavItem[]` array
2. Add a `NavSection` component call in both `DesktopSidebar` and `MobileSidebar`
3. Add the `inYourSection` boolean derived from `pathname`
4. Update this doc
