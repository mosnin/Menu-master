# Deal Desk — Support Runbook

Operational guide for pilot admins and on-call support.

---

## Health Check

Hit the health endpoint to get a quick status of all dependencies:

```
GET /api/health
```

Returns JSON with status for database, storage, auth, and Inngest. A `200` response means all critical systems are up. A `503` with `"status": "degraded"` tells you which check failed.

---

## Common Issues and Resolutions

### App won't start / blank screen after sign-in

1. Verify `.env` has all required variables (compare against `.env.example`).
2. Run `pnpm build` and check for TypeScript errors.
3. Check browser console for Auth0 redirect errors — usually a misconfigured callback URL.

### "Unable to connect to database" or empty dashboard

1. Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.
2. Hit `/api/health` — check the `database` field.
3. Verify the Supabase project is not paused (free-tier projects pause after inactivity).
4. Confirm migrations have been applied (see Reset Seed Data below).

### Sign-in redirects in a loop

1. Check that `AUTH0_BASE_URL` matches the URL you are accessing (e.g., `http://localhost:3000`).
2. In the Auth0 dashboard, verify Allowed Callback URLs includes `{AUTH0_BASE_URL}/auth/callback`.
3. Clear browser cookies for the domain and try again.

### Documents upload but extraction shows "failed"

1. Check that `OPENAI_API_KEY` is set and valid.
2. Check server logs for OpenAI API errors (rate limit, invalid key, network timeout).
3. Scanned/image-only PDFs are a known limitation — extraction may not work on them.
4. There is no automatic retry. Re-upload the document to trigger extraction again.

### Daily digest is not generating

1. Inngest must be running. See "Check Background Jobs" below.
2. Verify digest settings at `/settings/digests` — the user must have digest enabled.

### Emails are not being sent

1. Check that `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set.
2. Without these, emails are logged to the server console instead of sent. Check server output.
3. For production, the sending domain must be verified in Resend.

### Approval stuck in pending state

1. Navigate to the transaction's approvals tab: `/transactions/[id]/approvals`.
2. Verify the approval is assigned to a user with the correct role (typically broker_admin).
3. Sign in as the assigned approver and check if the approve/reject buttons are visible.
4. If the approval appears orphaned (no assigned user), check the `approvals` table in Supabase directly.

---

## How to Check Background Jobs (Inngest)

**Local development:**

```bash
pnpm inngest:dev
```

This starts the Inngest dev server (default: `http://localhost:8288`). Open the Inngest dashboard in a browser to see registered functions, recent runs, and failures.

**Production:**

Check for `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in the environment. View the Inngest cloud dashboard for function execution history.

**Quick check:** The `/api/health` endpoint reports Inngest status. In production, missing Inngest env vars will show as a failed check.

---

## How to Verify Auth0 Connection

1. Hit `/api/health` — the `auth` check confirms all required Auth0 env vars are present.
2. Open `/signin` in an incognito window and verify the Auth0 login page loads.
3. In the Auth0 dashboard, check the application's "Logs" tab for recent login events.
4. Required env vars: `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`.

---

## How to Reset Seed Data

To reset the database to the demo state with all 4 transactions and 3 users:

```bash
# Option 1: Via seed script (requires exec_sql RPC function in Supabase)
pnpm db:seed

# Option 2: Apply seed SQL directly
# Supabase Dashboard > SQL Editor > paste contents of supabase/seed.sql

# Option 3: Using psql
psql $DATABASE_URL -f supabase/seed.sql
```

After re-seeding, verify in the app:
- 4 transactions visible when signed in as Maria Gonzalez (broker_admin)
- 3 users in the organization: Maria Gonzalez, James Whitfield, Sarah Chen

---

## How to Check for Stuck Approvals

Query the approvals table in Supabase:

```sql
SELECT a.id, a.status, a.created_at, t.name as transaction_name
FROM approvals a
JOIN transactions t ON t.id = a.transaction_id
WHERE a.status = 'pending'
ORDER BY a.created_at ASC;
```

Approvals pending for more than 48 hours may indicate the assigned approver is not active or the notification was missed.

---

## How to Verify Email Sending

1. Check server logs for `[email]` entries. Without Resend configured, email payloads are logged to the console.
2. With Resend configured, check the Resend dashboard for delivery status.
3. Test manually: trigger a digest or approval notification and verify delivery.

---

## Log Locations and Debugging

- **Next.js server logs:** Terminal where `pnpm dev` is running (or container stdout in production).
- **Inngest function logs:** Inngest dev dashboard at `http://localhost:8288` (local) or Inngest cloud dashboard (production).
- **Supabase logs:** Supabase Dashboard > Logs (database queries, auth events, storage operations).
- **Auth0 logs:** Auth0 Dashboard > Monitoring > Logs (login attempts, token issues).
- **Browser console:** Client-side errors, failed API calls, network issues.

**Debugging approach:**
1. Reproduce the issue and note the URL/action.
2. Check `/api/health` for system-level failures.
3. Check the browser console for client errors.
4. Check Next.js server logs for API route errors.
5. If the issue involves background processing, check Inngest logs.
6. If the issue involves data, query Supabase directly.

---

## Escalation Paths

| Severity | Condition | Action |
|----------|-----------|--------|
| P1 — App down | Health endpoint returns 503, no users can sign in | Check Supabase and Auth0 status. Restart the app. Escalate to engineering. |
| P2 — Feature broken | A core workflow (documents, approvals, closing) is non-functional | Collect repro steps and server logs. File an issue. |
| P3 — Data issue | Incorrect data displayed, missing seed records | Attempt re-seed. If persistent, escalate to engineering with query results. |
| P4 — Cosmetic / UX | Layout issue, mobile rendering, non-blocking UI bug | Document with screenshot. File an issue for next release. |
