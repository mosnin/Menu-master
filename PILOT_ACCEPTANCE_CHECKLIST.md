# Deal Desk — Pilot Acceptance Checklist

Complete all items before confirming pilot readiness with the team. Each item should be verified by a pilot admin.

---

## Environment and Access

- [ ] App is accessible at the expected URL
- [ ] `/api/health` returns `200` with all checks passing
- [ ] Admin account (Maria Gonzalez, broker_admin) can sign in successfully
- [ ] Agent account (James Whitfield) can sign in successfully
- [ ] Coordinator account (Sarah Chen) can sign in successfully

## Role-Based Access

- [ ] Broker admin sees all 4 transactions on the dashboard
- [ ] Agent sees only their assigned transactions
- [ ] Coordinator sees transactions they are assigned to
- [ ] Broker-only routes (`/broker`, `/broker/forecast`, `/broker/compliance`) are restricted to broker_admin

## Transaction Creation

- [ ] Navigate to `/transactions/new` and create a new transaction
- [ ] New transaction appears on the dashboard and in `/transactions` list
- [ ] Transaction can be opened and all tabs load (overview, documents, checklist, approvals, closing)

## Document Upload and Extraction

- [ ] Upload a PDF document to a transaction via `/transactions/[id]/documents`
- [ ] Document appears in the documents list after upload
- [ ] AI extraction runs and populates extracted fields (requires `OPENAI_API_KEY`)
- [ ] Failed extraction shows a clear error state (test with a scanned/image PDF if available)

## Approval Flow

- [ ] Pending approval is visible on 742 Evergreen Terrace at `/transactions/[id]/approvals`
- [ ] Broker admin can approve or reject the pending approval
- [ ] Approval status updates are reflected in the transaction view
- [ ] Non-authorized roles cannot perform approval actions

## Work Queue

- [ ] `/queue` loads and displays prioritized items
- [ ] Queue items are relevant to the signed-in user's role
- [ ] Clicking a queue item navigates to the correct transaction/action

## Closing Room

- [ ] Open 900 Baseline Rd and navigate to `/transactions/[id]/closing`
- [ ] Closing readiness score is displayed
- [ ] Lender milestones are visible (appraisal, underwriting, clear to close)
- [ ] Title/escrow progress is shown
- [ ] Document requests and their statuses are listed
- [ ] Collaborators page (`/transactions/[id]/collaborators`) shows external parties

## Broker Views

- [ ] `/broker` shows the brokerage-level portfolio overview
- [ ] `/broker/forecast` displays revenue forecast data
- [ ] `/broker/compliance` shows compliance status across the portfolio
- [ ] Data in broker views is consistent with individual transaction data

## Analytics and Pilot Readiness

- [ ] `/analytics` renders with pipeline and performance metrics
- [ ] `/getting-started` displays the onboarding guide
- [ ] Metrics displayed are reasonable given the seed data

## Daily Digest

- [ ] Inngest is running (`pnpm inngest:dev` locally or configured in production)
- [ ] `/digest` renders digest content for the signed-in user
- [ ] Digest settings at `/settings/digests` are configurable
- [ ] If Resend is configured: test email delivery of the digest

## Known Limitations Reviewed

- [ ] Pilot team has read `KNOWN_LIMITATIONS.md`
- [ ] Team understands that AI extraction requires an OpenAI API key
- [ ] Team understands that email requires Resend configuration
- [ ] Team understands that background jobs require Inngest to be running
- [ ] Team understands mobile is functional but not fully optimized
- [ ] No items in the known limitations list are blockers for pilot scope

---

**Sign-off:** Once all items are checked, the pilot team confirms acceptance and the release candidate is approved for pilot use.
