# Brokerage Economics and Compliance

This document describes the commission tracking, revenue forecasting, compliance review, policy enforcement, and management reporting features added in Phase 5 of the Deal Desk platform.

## Commission Model

### Commission Types

Each transaction can have one of two commission types:

- **Percentage**: Gross commission is calculated as `purchase_price * commission_rate / 100`. This is the standard model for most residential transactions.
- **Flat**: Gross commission is a fixed dollar amount (`commission_amount`), independent of purchase price.

### Representation Sides

A transaction records which side the brokerage represents:

- `buyer` -- representing the purchasing party
- `seller` -- representing the listing/selling party
- `dual` -- representing both sides (where permitted by state law)

### Splits

Once the gross commission is determined, it is split between the brokerage and the agent:

- `brokerage_split_pct` defines the brokerage's share as a percentage of gross commission.
- `brokerage_share = gross_commission * brokerage_split_pct / 100`
- `agent_share = gross_commission - brokerage_share`

Detailed commission splits are tracked in the `commission_splits` table, which supports multiple recipients per transaction (agent, co-agent, team lead, brokerage, referral, other).

### Referrals

When a referral partner is involved:

- `has_referral` is set to `true`
- `referral_fee_pct` defines the referral fee as a percentage of gross commission
- `referral_fee_amount = gross_commission * referral_fee_pct / 100`
- `net_brokerage_revenue = brokerage_share - referral_fee_amount`

When there is no referral, `net_brokerage_revenue` equals `brokerage_share`.

### Finalization

Economics records start as projected (`is_projected = true`, `is_finalized = false`). When the transaction closes, a broker admin finalizes the economics record:

- Sets `is_finalized = true` and `is_projected = false`
- Records `finalized_at` timestamp and `finalized_by_user_id`
- Only users with the `broker_admin` role can finalize economics

## Forecast System

### Projected vs Weighted vs Closed

Revenue forecasting uses three metrics:

- **Total Projected**: Sum of `gross_commission` across all transactions in the forecast period, regardless of close probability.
- **Total Weighted**: Sum of `gross_commission * close_probability / 100` -- a risk-adjusted view of expected revenue.
- **Total Closed**: Sum of `gross_commission` for transactions with status `closed` in the period.

### Close Probability

Each transaction economics record carries a `close_probability` (0-100) representing the likelihood the deal will close. This feeds into weighted revenue calculations and pipeline analysis.

### Monthly Snapshots

The `close_forecast_snapshots` table stores point-in-time snapshots of forecast data:

- Keyed by `(organization_id, snapshot_date, forecast_month)` with a uniqueness constraint
- Contains aggregate totals, transaction count, at-risk count, and per-deal details as JSONB
- Snapshots are computed by `computeForecast()` and stored via upsert, allowing historical trend analysis

### Pipeline Summary

The pipeline summary breaks down active (non-finalized) economics by:

- Transaction status
- Office
- Agent (created_by_user_id)

### Concentration Risk

The system identifies concentration risk when any single deal represents more than 30% of total forecasted revenue. The `getConcentrationRisk()` function returns the top 10 deals by gross commission with their percentage of total, plus a flag and list of high-concentration deal IDs.

## Compliance System

### Issue Categories

Compliance issues are categorized as:

| Category | Description |
|---|---|
| `missing_document` | Required document not found on the transaction |
| `missing_approval` | Pending approval has exceeded the SLA (48 hours) |
| `risky_communication` | Flagged outbound communication |
| `stage_block` | Transaction blocked from advancing to the next stage |
| `unresolved_exception` | Critical transaction exception remains open |
| `missing_economics` | Active transaction lacks economics data or gross commission |
| `readiness_inconsistency` | Closing is imminent but readiness score is below 65% |
| `policy_violation` | A policy rule has been violated |
| `other` | Miscellaneous compliance concern |

### Severity Levels

- **info** -- Informational; no action required immediately.
- **warning** -- Attention needed; should be resolved before closing.
- **critical** -- Must be resolved; may block transaction progress.

### Lifecycle

Compliance issues follow this lifecycle:

```
open --> under_review --> resolved
                     \--> overridden
open --> blocked --> resolved
```

- **open**: Newly detected or unassigned.
- **under_review**: Assigned to a user for investigation.
- **blocked**: Issue is blocking transaction progress.
- **resolved**: Issue has been addressed and closed with resolution notes.
- **overridden**: Issue has been acknowledged but waived (with documented reason).

### Deduplication

The compliance scanner (`scanForIssues`) deduplicates by `category + transaction_id`. If an open, under_review, or blocked issue already exists for the same category on a transaction, a new one will not be created.

### Statistics

`getComplianceStats()` returns counts grouped by status, severity, and category across all issues in an organization.

## Policy Engine

### Rule Categories

Policy rules fall into these categories:

| Category | What it checks |
|---|---|
| `required_document` | A specific document type must exist on the transaction |
| `required_approval` | An approval of a specific type must be in `approved` status |
| `required_economics` | Economics record must exist; optionally must be finalized or have gross commission |
| `stage_gate` | Transaction cannot advance from a blocked status without meeting conditions |
| `compliance_signoff` | All compliance issues must be resolved before proceeding |
| `correction_review` | Low-confidence extractions must be manually reviewed |

### Enforcement Modes

Each rule has an enforcement mode that determines the consequence when violated:

- **warn**: The system surfaces a warning but does not block the action. Result status: `warn`.
- **block**: The system prevents the action entirely. Result status: `block`.
- **require_override**: The action is blocked unless an approved override exists. Result status: `override_required`.

### Override Flow

When a rule in `require_override` mode is violated:

1. A coordinator or broker admin submits an override request with a reason.
2. The override is created with status `pending`.
3. A broker admin reviews and either approves or rejects the override.
4. If approved, subsequent evaluations of that rule for that transaction return `pass`.
5. Overrides can optionally have an `expires_at` date; expired overrides are treated as if they do not exist.

## Office/Team Hierarchy

### Offices

Each organization can have multiple offices. An office has:

- A name, address, and active/inactive status
- An optional managing broker (`managing_broker_id`)
- Transactions can be assigned to an office via `transactions.office_id`

### Teams

Teams exist within offices. Each team has:

- A name, optional office association, and team lead
- Active/inactive status

### Memberships

The `office_memberships` table links users to offices and optionally to teams:

- Roles: `agent`, `team_lead`, `office_manager`, `managing_broker`
- `is_primary` indicates the user's primary office
- Unique constraint on `(user_id, office_id)` prevents duplicate memberships

### Role-Based Access

Office membership roles are distinct from organization membership roles (`agent`, `coordinator`, `broker_admin`). The organization role governs feature access, while the office membership role provides additional context for reporting and management hierarchies.

## Reporting

Reports are available at four levels:

- **Broker level**: Full pipeline summary, concentration risk, compliance stats across all offices and teams.
- **Office level**: Pipeline filtered by `office_id`, compliance issues for transactions in that office.
- **Team level**: Pipeline filtered by `team_id`, agent performance within the team.
- **Agent level**: Individual agent's transactions, commission splits, and deal health.

The pipeline summary (`getPipelineSummary`) breaks down total projected and weighted revenue by status, office, and agent. Concentration risk analysis identifies deals that represent a disproportionate share of forecasted revenue.

## Authorization

| Action | Required Role |
|---|---|
| View transaction economics | `agent` or higher |
| Edit transaction economics | `coordinator` or higher |
| Finalize economics | `broker_admin` only |
| View compliance queue | `coordinator` or higher |
| Assign/resolve compliance issues | `coordinator` or higher |
| Override compliance issues | `broker_admin` only |
| Create/edit policy rules | `broker_admin` only |
| View policy rules | `coordinator` or higher |
| Request policy override | `coordinator` or higher |
| Approve/reject policy override | `broker_admin` only |
| View pipeline/forecast reports | `coordinator` or higher |
| View all broker-level reports | `broker_admin` only |

The role hierarchy is: `agent` (1) < `coordinator` (2) < `broker_admin` (3). The `hasMinimumRole()` utility enforces this ordering.

## Deferred Items

The following features are planned for future implementation:

- **Inngest workflows for periodic compliance scanning**: Scheduled jobs that run `scanForIssues` across all active transactions on a recurring basis (e.g., daily) to detect new compliance issues automatically.
- **PDF report generation**: Export pipeline summaries, compliance reports, and individual transaction economics as formatted PDF documents for broker review and regulatory filing.
- **Email notifications**: Automated alerts to assignees when compliance issues are created, when overrides require approval, when forecast snapshots show significant changes, and when economics need finalization before closing.
- **Audit trail exports for compliance reports**: Extend the existing audit export system to include economics changes, compliance issue lifecycle events, and policy evaluation results.
