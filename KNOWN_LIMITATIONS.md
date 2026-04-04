# Deal Desk — Known Limitations

Current as of release candidate. This list is shared with pilot users.

---

## Data

- Dashboard stat cards may show placeholder or zero values when transactions lack complete seed data.
- Some seed data is static and does not update dynamically (e.g., health scores, responsiveness metrics on demo transactions).
- The "Purchase - 1580 Canyon Blvd #204" transaction is intentionally minimal (draft status) and will appear sparse.

## Auth

- Authentication is session-based via Auth0. Sessions expire according to Auth0 tenant settings.
- Authorization uses a three-tier role hierarchy: agent < coordinator < broker_admin. There is no granular permission model (e.g., per-field or per-action permissions) beyond this hierarchy.
- No support for multiple organizations per user.

## AI Extraction

- Requires a valid `OPENAI_API_KEY` environment variable. Without it, AI features are disabled and documents require manual classification and data entry.
- Extraction works best on clean, text-based PDFs. Scanned documents or low-quality images may fail extraction or produce inaccurate results.
- Failed extractions surface an error state — manual review is the fallback path.
- No retry mechanism for failed extractions in the current build.

## Email

- Requires a valid `RESEND_API_KEY` and configured `RESEND_FROM_EMAIL`. Without these, outbound emails are logged to the server console instead of sent.
- The sending domain must be verified in Resend for production use.

## Background Jobs

- Inngest must be running (`pnpm inngest:dev` locally) for digest generation, automated reminders, and document processing workflows.
- If Inngest is not running, these features silently do not execute.
- No dead-letter queue or alerting for failed background jobs in the current build.

## External Collaboration

- External users (lenders, title companies) access the platform via token-based URLs.
- No SSO integration for external users.
- Tokens do not currently expire automatically — manual revocation is required.

## Search

- No global search across transactions, documents, or contacts.
- Navigation relies on the dashboard, queue, and direct transaction links.

## Notifications

- No in-app notification system (bell icon, toast alerts for new events, etc.).
- Users rely on the daily digest and email for updates.

## Mobile

- All routes are functional on mobile viewports.
- Some workflows (document upload, checklist management, closing room) are not optimized for small screens and may require extra scrolling.

## Scale

- The application has not been load-tested beyond demo data volumes (~4 transactions, ~3 users).
- Query performance with hundreds of transactions or thousands of documents is untested.

## Offline

- No offline support. The app requires an active internet connection and access to Supabase and Auth0.
