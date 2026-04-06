# Automation Environment Setup

## Required variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended variables
- `OPENAI_API_KEY`
- `AUTH0_SECRET`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

## Verification
1. Run `npm run db:migrate`.
2. Start app with `npm run dev`.
3. Open `/ops/automation-setup` and click **Validate environment**.
4. Ensure readiness shows `ready` before pilot release.
