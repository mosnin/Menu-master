# Deal Desk Automation Release Candidate Checklist

## 1) Environment readiness
- Confirm required env vars are set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Confirm recommended vars are set (OpenAI/Auth0 set) for pilot parity.
- Run `npm run db:migrate` and verify no migration failures.

## 2) Core workflow path smoke
1. Create workflow from natural language in `/ops/workflows/new`.
2. Validate draft and inspect assumptions/warnings.
3. Run simulation/explain flow.
4. Publish with governance checks.
5. Trigger run and inspect trace/events.

## 3) Ops control path smoke
- Governance: bootstrap scopes + run gap scan.
- Library: export bundle + import bundle (blocked case + pass case).
- Setup: create onboarding session + readiness update.
- Success: add intervention note.
- ROI: recompute economics and inspect top-value/negative signals.

## 4) Safety checks
- Verify role-gating for admin actions.
- Verify org isolation by switching org membership context.
- Verify blocked setup and blocked import messages are explicit.

## 5) Incident/recovery readiness
- Simulate degraded/incident case.
- Verify pause/rollback actions and review logs/evidence traces.

## 6) Final sign-off
- Unit tests pass.
- Known limitations reviewed with pilot team.
- Pilot runbook and support runbook reviewed with operators.
