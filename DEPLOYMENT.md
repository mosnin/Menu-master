# Deployment Guide — Deal Desk

This guide covers deploying Deal Desk to Vercel with Supabase, Auth0, Resend, and Inngest.

## Prerequisites

- Node.js 20+, pnpm 9+
- Vercel account (with CLI installed: `npm i -g vercel`)
- Supabase project (free tier works for staging)
- Auth0 tenant
- Resend account (optional for staging)
- Inngest account (optional for staging)

---

## 1. Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note the **Project URL**, **anon key**, and **service role key** from
   **Project Settings > API**.

### Run migrations

```bash
# Set your Supabase credentials
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run migrations
pnpm db:migrate
```

### Create the storage bucket

1. In the Supabase dashboard, go to **Storage**.
2. Create a new bucket named `documents`.
3. Set it to **private** (not public).
4. The app uses the service role key for server-side access, so no RLS policies
   are needed on the bucket for now.

### Seed data (optional, staging only)

```bash
pnpm db:seed      # Creates base reference data
pnpm db:demo      # Creates sample transactions and documents
```

---

## 2. Auth0 Setup

### Create an application

1. In the Auth0 dashboard, create a **Regular Web Application**.
2. Note the **Domain**, **Client ID**, and **Client Secret**.

### Configure callback URLs

For each environment, add the appropriate URLs:

| Setting                | Local                     | Staging                           | Production                       |
|------------------------|---------------------------|-----------------------------------|----------------------------------|
| Allowed Callback URLs  | `http://localhost:3000/auth/callback` | `https://staging.yourdomain.com/auth/callback` | `https://app.yourdomain.com/auth/callback` |
| Allowed Logout URLs    | `http://localhost:3000`   | `https://staging.yourdomain.com`  | `https://app.yourdomain.com`     |
| Allowed Web Origins    | `http://localhost:3000`   | `https://staging.yourdomain.com`  | `https://app.yourdomain.com`     |

You can add all URLs to a single Auth0 application (comma-separated) or create
separate applications per environment.

### Environment variables

- `AUTH0_SECRET` — generate with `openssl rand -hex 32` (unique per environment)
- `AUTH0_BASE_URL` — the full URL of the deployed app
- `AUTH0_ISSUER_BASE_URL` — `https://your-tenant.auth0.com`
- `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` — from the application settings

---

## 3. Resend Setup (Optional)

1. Sign up at [resend.com](https://resend.com).
2. **Verify a sending domain** (or use `onboarding@resend.dev` for testing).
3. Create an API key and set `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on your verified domain.

Without Resend configured, emails are logged to the server console.

---

## 4. Inngest Setup

1. Sign up at [inngest.com](https://inngest.com).
2. Create an app and note the **Event Key** and **Signing Key**.
3. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.

For local development, use the Inngest dev server instead:

```bash
pnpm inngest:dev
```

In production, Inngest will call your `/api/inngest` endpoint. Ensure this
route is accessible (not blocked by middleware or auth).

---

## 5. Vercel Deployment

### Link the project

```bash
vercel link
```

### Set environment variables

Set all required variables in the Vercel dashboard or via CLI:

```bash
# Required
vercel env add AUTH0_SECRET
vercel env add AUTH0_BASE_URL
vercel env add AUTH0_ISSUER_BASE_URL
vercel env add AUTH0_CLIENT_ID
vercel env add AUTH0_CLIENT_SECRET
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Optional
vercel env add OPENAI_API_KEY
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add INNGEST_EVENT_KEY
vercel env add INNGEST_SIGNING_KEY
```

Use separate values for **Preview** (staging) and **Production** environments
in the Vercel dashboard.

### Build settings

- **Framework Preset**: Next.js
- **Build Command**: `pnpm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `pnpm install --frozen-lockfile`
- **Node.js Version**: 20.x

### Deploy

```bash
# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod
```

---

## 6. Staging Verification (Smoke Tests)

After deploying to staging, verify these items:

- [ ] **Health check**: `GET /api/health` returns `{ status: "ok" }` with all
      checks passing
- [ ] **Authentication**: Sign in via Auth0, confirm redirect back to the app
- [ ] **Database**: The dashboard loads and shows transactions (or empty state)
- [ ] **Document upload**: Upload a PDF, confirm it appears in the documents list
- [ ] **Storage**: Verify the uploaded file is accessible (download it)
- [ ] **AI extraction** (if OPENAI_API_KEY set): Confirm document processing
      completes and extracts fields
- [ ] **Email** (if RESEND_API_KEY set): Trigger an approval email and confirm
      delivery
- [ ] **Inngest** (if configured): Check the Inngest dashboard for function
      execution logs
- [ ] **Error handling**: Access a non-existent route, confirm 404 page renders

---

## 7. Production Launch Checklist

- [ ] All required environment variables are set for the Production environment
- [ ] `AUTH0_BASE_URL` points to the production domain
- [ ] Auth0 callback URLs include the production domain
- [ ] `AUTH0_SECRET` is unique (not shared with staging)
- [ ] Supabase migrations have been run on the production database
- [ ] The `documents` storage bucket exists in Supabase
- [ ] Resend sending domain is verified for the production domain
- [ ] Inngest event key and signing key are set
- [ ] Custom domain is configured in Vercel (if applicable)
- [ ] SSL certificate is active on the custom domain
- [ ] `GET /api/health` returns 200 on production
- [ ] Vercel analytics / logging are enabled
- [ ] Error monitoring is configured (Vercel or third-party)
- [ ] A backup/recovery plan exists for the Supabase database

---

## Staging vs Production Differences

| Concern           | Staging                          | Production                        |
|-------------------|----------------------------------|-----------------------------------|
| Auth0             | Test tenant or shared app        | Separate app or strict callbacks  |
| Supabase          | Separate project (free tier OK)  | Paid plan, point-in-time recovery |
| OpenAI            | Can omit (AI features disabled)  | Set for full functionality        |
| Resend            | Use test domain or omit          | Verified production domain        |
| Inngest           | Dev server or test keys          | Production keys                   |
| `AUTH0_BASE_URL`  | Vercel preview URL               | Production domain                 |
