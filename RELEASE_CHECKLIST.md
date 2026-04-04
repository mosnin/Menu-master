# Deal Desk — Pre-Release Verification Checklist

Complete all items before tagging a release candidate.

---

## Local Environment Setup

- [ ] Node.js 18+ installed
- [ ] `pnpm install` completes without errors
- [ ] `.env` file created from `.env.example` with all `[REQUIRED]` values filled in
- [ ] `pnpm dev` starts without errors on `http://localhost:3000`

## Auth0 Configuration

- [ ] `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` are set
- [ ] Auth0 application has correct callback URLs configured:
  - Allowed Callback URLs: `{AUTH0_BASE_URL}/auth/callback`
  - Allowed Logout URLs: `{AUTH0_BASE_URL}`
  - Allowed Web Origins: `{AUTH0_BASE_URL}`
- [ ] Sign-in flow works end-to-end (redirects to Auth0, returns to app)
- [ ] Sign-out flow works (clears session, redirects to sign-in)

## Supabase Connection, Migrations, and Seed Data

- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are set
- [ ] Migrations applied in order: `001_initial_schema` through `005_brokerage_economics`
- [ ] `pnpm db:seed` completes successfully (or seed.sql applied manually)
- [ ] "documents" storage bucket exists in Supabase Storage
- [ ] Verify seed data: 4 transactions, 3 users, 1 organization present in database

## TypeScript Compilation

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `pnpm build` completes successfully (full Next.js production build)

## Test Suite

- [ ] `pnpm test` passes — **206 tests expected across 10 test files**
- [ ] Unit tests pass: status-transitions, authorization-guards, checklist-generation, extraction-normalization, analytics, brokerage-economics, external-collaboration, ui-primitives
- [ ] Integration tests pass: approval-send-flow, transaction-document-flow

## Core Workflow Smoke Tests

Manually verify each flow in the running app:

- [ ] Sign in as each role: agent (James Whitfield), coordinator (Sarah Chen), broker_admin (Maria Gonzalez)
- [ ] Dashboard loads with transaction cards and health indicators
- [ ] Create a new transaction from `/transactions/new`
- [ ] Open 742 Evergreen Terrace — overview, documents, checklist, approvals tabs all load
- [ ] Upload a document and verify it appears in the documents list
- [ ] Mark a checklist item complete
- [ ] Submit and process an approval
- [ ] Open 900 Baseline Rd — closing tab shows readiness score, lender milestones, title progress
- [ ] Broker views load: `/broker`, `/broker/forecast`, `/broker/compliance`
- [ ] Work queue at `/queue` displays items
- [ ] Analytics at `/analytics` renders charts/metrics
- [ ] Digest at `/digest` renders content
- [ ] Daily digest settings configurable at `/settings/digests`

## Role-Based Access Verification

- [ ] Agent can only see their own transactions
- [ ] Coordinator can see transactions they are assigned to
- [ ] Broker admin can see all transactions across the organization
- [ ] Broker-only routes (`/broker/*`) are not accessible to agent or coordinator roles
- [ ] Approval actions are restricted to authorized roles

## Mobile Responsive Check

Test on a 375px-wide viewport (or mobile device):

- [ ] `/dashboard` — cards stack correctly, no horizontal overflow
- [ ] `/transactions/[id]/overview` — readable, no truncated content
- [ ] `/transactions/[id]/documents` — document list usable
- [ ] `/transactions/[id]/closing` — closing readiness data visible
- [ ] `/queue` — queue items tappable and readable
- [ ] Navigation menu accessible on mobile

## Performance Sanity

- [ ] Dashboard loads in under 3 seconds on local dev
- [ ] Transaction detail pages load in under 2 seconds
- [ ] No visible N+1 query patterns in Supabase logs (spot-check document list, checklist, approvals)
- [ ] No console errors or unhandled promise rejections during smoke tests

## Known Limitations Acknowledged

- [ ] Team has reviewed `KNOWN_LIMITATIONS.md`
- [ ] Pilot users have been briefed on current limitations
- [ ] No blockers remain in the known limitations list for pilot scope
