# Deal Desk — Claude Code Reference

This file is the primary reference for Claude Code sessions. Read it before making any changes.

## What This App Is

**Deal Desk** is a real-estate transaction management platform for brokerages. It lets agents, coordinators, and broker admins manage the full lifecycle of real estate transactions: checklists, documents, approvals, timelines, collaborators, communication digests, listings, and automation workflows.

Deployed at: `https://menu-master-weld.vercel.app/`  
Repo: `mosnin/Menu-master`  
Active dev branch: `claude/fix-build-errors-akFO5`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Auth | Auth0 v4 (`@auth0/nextjs-auth0`) |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI (via `openai` SDK) |
| Background jobs | Inngest |
| Email | Resend |
| UI | Radix UI + Tailwind CSS v4 + lucide-react |
| Testing | Vitest |
| Deployment | Vercel |

Key version constraints:
- Next.js: `^15.1.0` (uses `experimental.nodeMiddleware`)
- React: `^19.0.0`
- Auth0: `^4.5.1` — **requires Node.js runtime** (not Edge); see `middleware.ts`

---

## Project Structure

```
app/
  (authenticated)/       # All pages behind auth — layout wraps with sidebar + header
    dashboard/
    inbox/
    queue/
    digest/
    transactions/        # [id]/ has nested routes (documents, checklist, etc.)
    listings/
    approvals/
    notifications/
    analytics/
    broker/              # forecast/, compliance/
    ops/                 # workflows/, workflow-runs/, automation-*/
    settings/            # rules/, templates/, digests/, policies/
    admin/               # imports/, duplicates/, diagnostics/
    seller-portal/
    getting-started/
    onboarding/
  api/                   # Route handlers (REST + Inngest webhook)
  auth/                  # Auth0 catch-all ([...auth0])
  signin/ signup/        # Public pages
  page.tsx               # Root — redirects to /dashboard or /signin

components/
  layout/                # header.tsx, sidebar.tsx (main nav)
  ui/                    # shadcn-style primitives (button, badge, dialog, etc.)
  feedback/              # FeedbackForm
  notifications/         # NotificationBell
  search/                # SearchCommand
  transaction/           # Transaction-specific widgets
  workflow/              # Workflow builder components
  (and more per-feature dirs)

lib/
  auth/session.ts        # Auth0 helpers: getServerSession, requireAuth, requireRole
  db/client.ts           # Supabase client
  services/              # Business logic (server-only)
  repositories/          # DB query layers
  ai/                    # OpenAI integrations
  workflows/             # Workflow engine helpers

middleware.ts            # Auth0 middleware — runtime = 'nodejs' (required)
next.config.ts           # experimental.nodeMiddleware = true (required for Node middleware)
supabase/migrations/     # 024 migration files — source of truth for DB schema
```

---

## Authentication & Authorization

### Auth0 Setup
- Uses Auth0 v4 (`@auth0/nextjs-auth0`)
- Routes handled automatically: `/auth/login`, `/auth/callback`, `/auth/logout`
- **Auth0 Dashboard must have** Callback URL set to `https://<domain>/auth/callback` (NOT `/api/auth/callback`)
- Middleware runs in **Node.js runtime** (not Edge) — `export const runtime = 'nodejs'` in `middleware.ts`

### Role System

Three roles, stored in `memberships.role`:

| Role | Value | Access |
|---|---|---|
| Agent | `agent` | Work section only |
| Coordinator | `coordinator` | Work + Automation sections |
| Broker Admin | `broker_admin` | Everything |

Role checks: `lib/auth/session.ts` — `requireRole(orgId, ['broker_admin'])` etc.

### Session Helpers (`lib/auth/session.ts`)

```typescript
getServerSession()          // returns Auth0 session or null
requireAuth()               // throws if not authed
requireOrgMembership(orgId) // checks memberships table
requireRole(orgId, roles)   // checks role in addition to membership
getCurrentUserProfile()     // user_profiles row + memberships
```

---

## Navigation Architecture

See `docs/nav-architecture.md` for the full nav tree.

The sidebar lives in `components/layout/sidebar.tsx`. Key design decisions:
- `NavItem` type has optional `exact?: boolean` — use for routes that are also prefixes (e.g. `/broker`, `/admin`, `/settings`)
- `matchesRoute(pathname, item)` — handles exact vs prefix matching
- Sections (`NavSection`) are collapsible and auto-open when the current route is within their subtree
- Role visibility is controlled via `minRole?: number` on `NavItem` (agent=1, coordinator=2, broker_admin=3)
- Mobile: `MobileSidebarSheet` (exported as `MobileSidebar`) — sheet-based overlay triggered by hamburger in header

---

## Database

24 migration files in `supabase/migrations/`. Run them in order (001 → 024) in Supabase SQL editor.

Core tables: `user_profiles`, `organizations`, `memberships`, `transactions`, `listings`, `documents`, `checklists`, `approvals`, `workflows`, `workflow_runs`, `notifications`, `digests`.

See `docs/database.md` for schema overview.

---

## Environment Variables

Required in Vercel (and `.env.local` for local dev):

```
# Auth0
AUTH0_SECRET
AUTH0_BASE_URL          # e.g. https://menu-master-weld.vercel.app
AUTH0_ISSUER_BASE_URL   # e.g. https://your-tenant.auth0.com
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# OpenAI
OPENAI_API_KEY

# Inngest
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY

# Resend
RESEND_API_KEY
```

---

## Development Workflow

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build — fix ALL TypeScript errors first
npm run lint         # ESLint
npx vitest           # Run tests
```

### Common TypeScript Gotchas in This Codebase

1. **All-optional types are "weak"** — TypeScript rejects assigning to `{ error?: string }` with an incompatible type. Use `Record<string, unknown>` for generic error return types.

2. **Auth0 v4 + Edge Runtime** — Auth0 v4 uses `crypto` and `CompressionStream` (Node.js). Never set `export const runtime = 'edge'` in middleware or any file that imports from `lib/auth/session.ts`.

3. **`experimental.nodeMiddleware`** — Next.js 15.5+ feature. Not yet in `ExperimentalConfig` TypeScript types; suppress with `// @ts-expect-error`.

4. **Literal type widening** — Ternary expressions can widen `'a' | 'b'` to `string`. Add explicit type annotations when needed: `const state: 'ready' | 'blocked' | 'in_progress' = ...`.

---

## Key Patterns

### Server Components (default)
All page.tsx files are Server Components unless marked `'use client'`. Fetch data directly in them using `lib/repositories/` or `lib/services/`.

### Client Components
Mark with `'use client'`. Used for interactive UI (forms, collapsibles, search, etc.).

### Server Actions
Defined in `app/(authenticated)/*/actions.ts` files. Use `'use server'` directive.

### Error Handling
Errors thrown in Server Components bubble to the nearest `error.tsx`. The top-level one is at `app/(authenticated)/error.tsx`.
