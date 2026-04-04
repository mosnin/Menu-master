# Deal Desk

Real estate transaction management platform for agents, coordinators, and broker admins. Upload transaction PDFs, get structured data extraction via AI, auto-generate checklists and timelines, and manage approval-gated outbound communications.

## Architecture

```
Next.js 15 (App Router) ─── Auth0 (authentication)
        │                         │
   Server Actions ──── Supabase (Postgres + Storage)
        │
   Inngest (background jobs) ──── OpenAI (extraction)
        │
   Resend (email) ──── Zod (validation)
```

**Key decisions:**
- All database writes go through server actions with auth checks
- No Supabase RLS — authorization enforced at the application layer
- AI outputs are always validated with Zod schemas before storage
- No outbound email without human approval
- Full audit logging on all significant actions
- Mock adapters for OpenAI and Resend when API keys are not set

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, App Router, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui |
| Auth | Auth0 (`@auth0/nextjs-auth0` v4) |
| Database | Supabase Postgres |
| Storage | Supabase Storage |
| AI | OpenAI (structured extraction) |
| Background Jobs | Inngest |
| Email | Resend |
| Validation | Zod |
| Package Manager | pnpm |

## Data Model

16 tables: `organizations`, `user_profiles`, `memberships`, `transactions`, `properties`, `contacts`, `transaction_parties`, `documents`, `document_extractions`, `checklist_templates`, `checklist_items`, `timeline_events`, `approvals`, `outbound_messages`, `reminders`, `audit_logs`

See `supabase/migrations/001_initial_schema.sql` for the full schema.

## User Roles

| Role | Permissions |
|------|------------|
| `agent` | Create and view transactions |
| `coordinator` | Manage documents, checklists, reminders, approvals |
| `broker_admin` | Full organization access |

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Auth0 account with a Regular Web Application
- Supabase project
- OpenAI API key (optional — mock mode available)
- Resend API key (optional — logs to console)

### 1. Clone and install

```bash
git clone <repo-url>
cd deal-desk
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env`. See `.env.example` for the full list.

### 3. Auth0 setup

1. Create a Regular Web Application in Auth0
2. Set Allowed Callback URLs: `http://localhost:3000/auth/callback`
3. Set Allowed Logout URLs: `http://localhost:3000`
4. Copy Client ID, Client Secret, and Domain to `.env`

### 4. Database setup

Run the migration SQL in your Supabase SQL editor:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste into Supabase SQL Editor and run
```

Create a storage bucket named `documents` in Supabase Storage.

### 5. Seed data (optional)

Run `supabase/seed.sql` in the Supabase SQL editor for demo data.

### 6. Run the app

```bash
pnpm dev
```

Visit `http://localhost:3000`

### 7. Run Inngest dev server (optional)

```bash
pnpm inngest:dev
```

Visit `http://localhost:8288` for the Inngest dashboard.

### 8. Run tests

```bash
pnpm test
```

## Core Workflows

### Flow A: Document Upload → Extraction → Checklist

1. User signs in via Auth0
2. User creates a transaction
3. User uploads PDF documents
4. Inngest job triggers document processing:
   - PDF text extraction
   - AI document classification
   - Structured field extraction (purchase agreement, disclosures)
   - Checklist generation from extracted data
   - Timeline event creation from extracted dates
   - Missing document flagging
   - Reminder email draft generation
5. Human reviews and approves outbound emails
6. Approved emails sent via Resend
7. All steps logged to audit trail

### Flow B: Scheduled Reminders

1. Inngest cron job runs daily at 8am
2. Finds reminders due today
3. Drafts reminder emails
4. Creates approval requests
5. On approval, sends email
6. Updates reminder and message status

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  (authenticated)/      # Protected routes (dashboard, transactions, approvals)
  actions/              # Server actions for mutations
  api/inngest/          # Inngest webhook endpoint
  signin/               # Public sign-in page
components/             # React components
  ui/                   # shadcn/ui base components
  layout/               # App shell, sidebar, header
  transaction/          # Transaction-specific components
  document/             # Document upload and list
  checklist/            # Checklist view
  timeline/             # Timeline view
  approval/             # Approval cards
lib/
  ai/                   # OpenAI integration (classifier, extractors, generators)
  auth/                 # Auth0 session helpers, role checks
  audit/                # Audit logging
  db/                   # Supabase client
  email/                # Resend client, send helper, templates
  repositories/         # Database access layer (one per table)
  services/             # Business logic (transaction, document, extraction, etc.)
  validation/           # Zod schemas (form inputs + AI outputs)
  workflows/            # Inngest functions (document processing, reminders)
types/                  # TypeScript domain types
tests/                  # Vitest tests
supabase/
  migrations/           # SQL migration files
  seed.sql              # Demo seed data
```

## AI Integration

Tightly bounded to:
1. Document classification
2. Purchase agreement field extraction
3. Disclosure field extraction
4. Checklist generation
5. Email draft generation

All AI responses validated with Zod schemas. Both raw model output and normalized results are persisted. Confidence scores stored. Low-confidence extractions flagged for manual review.

**Mock mode:** When `OPENAI_API_KEY` is not set, all AI functions return realistic mock data. This allows full local development without an OpenAI account.

## Tradeoffs

1. **Single migration file** — simpler for MVP, should split for production
2. **No Supabase RLS** — auth enforced at app layer for simplicity
3. **No OCR pipeline** — PDFs with no extractable text marked for manual review
4. **No real-time updates** — polling or manual refresh for now
5. **Seed data uses fixed UUIDs** — enables referential integrity in demo data

## Deferred for Later

- Voice, SMS, CRM sync, e-signature integrations
- OCR pipeline for image-based PDFs
- Supabase RLS for defense-in-depth
- Real-time updates via WebSocket/SSE
- Multi-org switching UI
- Bulk document upload progress
- CSV export of checklist and timeline
- Full-text search across transactions
- Reminder snooze action
- Manual extraction correction UI
- Command palette for quick navigation
- Role-based UI visibility (show/hide based on role)
