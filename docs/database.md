# Database Schema Reference

## Overview

Deal Desk uses **Supabase** (PostgreSQL). The schema is defined across 24 migration files in `supabase/migrations/`. Run them in order (001 → 024) against your Supabase project.

## Running Migrations

In Supabase Studio → SQL Editor, run each file in sequence:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_phase2.sql
...
supabase/migrations/024_automation_onboarding_success.sql
```

There is also `supabase/seed.sql` for initial seed data.

## Migration Index

| File | Contents |
|---|---|
| 001_initial_schema | Core tables: organizations, user_profiles, memberships, transactions, documents, checklists, approvals, notifications |
| 002_phase2 | Extended transaction fields, timeline events, collaborators, communications |
| 003_analytics | Analytics aggregation tables |
| 004_external_collaboration | Seller portal, external user access |
| 005_brokerage_economics | Commission tracking, financials |
| 006_platform_completeness | Miscellaneous platform tables |
| 007_import_diagnostics | Bulk import tracking, diagnostics |
| 008_listings | MLS listings, offers |
| 009_workflow_engine | Workflow definitions, steps, triggers |
| 010_onboarding | Onboarding checklists and state |
| 011_auth_hardening | RLS policies, auth security |
| 012_deal_orchestrator | AI deal orchestration plans |
| 013_action_policy | Automated action policies |
| 014_follow_through_sequences | Follow-up sequence engine |
| 015_orchestrator_plans | Orchestrator planning tables |
| 016_specialist_traces | AI specialist execution traces |
| 017_learning_adaptation | ML feedback/adaptation tables |
| 018_adaptive_planning | Adaptive workflow planning |
| 019_workflow_authoring | Visual workflow authoring/versioning |
| 020_automation_trace_convergence | Unified trace/log convergence |
| 021_automation_delegated_governance | Governance approval chains |
| 022_automation_economics_roi | ROI tracking per automation |
| 023_automation_packaging_distribution | Automation template marketplace |
| 024_automation_onboarding_success | Success metrics, onboarding KPIs |

## Core Tables (from 001)

### `organizations`
Brokerage tenants. Each user belongs to one or more orgs via `memberships`.

### `user_profiles`
One per Auth0 user. Linked via `auth0_user_id` (the `sub` claim).

### `memberships`
Join table: `user_profile_id` + `organization_id` + `role` (`agent` | `coordinator` | `broker_admin`) + `status` (`active` | `invited` | `suspended`).

### `transactions`
Core entity. Has `[id]/` nested routes for documents, checklist, timeline, collaborators, communications, audit log.

### `documents`
Attached to transactions. Stored in Supabase Storage.

### `checklists` / `checklist_items`
Per-transaction checklists with completion tracking.

### `approvals`
Approval requests with status (`pending` | `approved` | `rejected`). Shown in the Approvals nav item with a pending-count badge.

### `notifications`
Per-user notifications. `NotificationBell` component in the header polls these.

### `digests`
Periodic email digest records. Settings at `/settings/digests`.

## Supabase Client

```typescript
// lib/db/client.ts
import { supabase } from '@/lib/db/client';

// Always use typed queries:
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('organization_id', orgId);
```

The service-role client (for server-only operations) is also available — check `lib/db/client.ts` for the pattern.

## RLS

Row-Level Security is enabled (migration 011). All queries from client components use the anon key and are subject to RLS. Server actions can use the service-role key to bypass RLS when needed.
