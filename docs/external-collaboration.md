# External Collaboration & Closing Coordination

This document describes the external collaboration model, closing readiness scoring, deal health tracking, and related features added in Phase 4 of the Deal Desk platform.

---

## External Collaboration Model

### How Invites Work

External parties (lenders, title agents, escrow officers, attorneys, inspectors, appraisers) are invited to collaborate on a transaction through token-based invites.

1. A coordinator or broker_admin creates an invite via `inviteCollaborator()`, specifying the recipient's email, name, role, and optional permissions.
2. The system generates a unique `access_token` (UUID) and sets a **30-day expiry**.
3. The invite is stored with status `pending`.
4. The recipient uses the token to accept the invite, changing status to `accepted`.

### Collaborator Roles

| Role             | Description                              |
|------------------|------------------------------------------|
| `lender`         | Mortgage lender processing the loan      |
| `title_agent`    | Title company representative             |
| `escrow_officer` | Escrow account manager                   |
| `attorney`       | Legal counsel for any party              |
| `inspector`      | Home inspector                           |
| `appraiser`      | Property appraiser                       |
| `other`          | Any other external collaborator          |

### Permissions

Each invite carries a `permissions` JSONB field. Default permissions:

```json
{
  "can_view_documents": true,
  "can_upload_documents": true,
  "can_update_status": true
}
```

Permissions can be customized per invite. The `verifyCollaboratorAccess()` function checks that the token is valid, the invite is accepted, not expired, and scoped to the correct transaction.

### Token-Based Access

- Tokens are UUIDs, unique per invite.
- Tokens are validated on every request via `verifyCollaboratorAccess(token, transactionId)`.
- Access is denied if the invite is not `accepted`, is expired, or targets a different transaction.
- Tokens expire 30 days after creation. There is no refresh mechanism; a new invite must be issued.

### Invite Lifecycle

```
pending -> accepted (via acceptInvite)
pending -> revoked  (via revokeInvite)
pending -> expired  (when expires_at passes)
```

Accepted invites cannot be re-revoked through the invite flow; the invite remains accepted but access checks will fail after expiry.

---

## Document Requests

### Lifecycle

Document requests allow internal users to request documents from external parties (buyers, sellers, or collaborators) via a secure token link.

```
sent -> viewed -> uploaded
sent -> expired
sent -> cancelled
viewed -> uploaded
viewed -> expired
viewed -> cancelled
```

1. **sent**: A request is created via `createRequest()`. A unique `access_token` and default **14-day expiry** are generated. The `expiresInDays` parameter can override the default.
2. **viewed**: When the recipient opens the request link, `markViewed()` updates the status and records `viewed_at`.
3. **uploaded**: When the recipient uploads a file, `handleUpload()` creates a `document_request_upload` record linking the upload to both the request and the document, and updates the request status.

### Secure Upload Flow

- The recipient accesses the request using the `access_token`.
- `verifyRequestAccess(token)` validates the token has not expired and the request is not cancelled.
- Uploaded files are linked to the transaction's document store via a `document_id` foreign key.
- Each upload records the uploader's email, name, file name, and file size.

### Expiry and Cancellation

- Expired requests reject any further views or uploads.
- Cancelled requests (via `cancelRequest()`) are also permanently inactive.
- A `reminder_count` and `last_reminder_at` field support future reminder functionality.

---

## Lender Workspace

### Milestones Tracked

Lender progress is tracked through ordered milestones:

1. `pre_approval_received`
2. `underwriting_started`
3. `appraisal_ordered`
4. `appraisal_received`
5. `conditional_approval`
6. `clear_to_close`
7. `funding_confirmed`

### How Updates Flow

- Lender collaborators (or internal users) submit status updates via `submitStatusUpdate()`.
- Each update records the milestone, status (`completed`, `in_progress`, `blocked`), notes, and optional evidence document.
- A timeline event is automatically created for each milestone update, making lender progress visible in the transaction timeline.
- `getLenderProgress()` returns all milestones with completion status for progress bar rendering.

### Financing Score

The lender milestone progress feeds into the closing readiness financing score:

| Milestone              | Score |
|------------------------|-------|
| underwriting_started   | 50    |
| conditional_approval   | 75    |
| clear_to_close         | 100   |
| funding_confirmed      | 100   |

---

## Title & Escrow Workspace

### Milestones Tracked

Title and escrow progress uses a parallel milestone system:

1. `title_search_started`
2. `title_search_completed`
3. `title_commitment_issued`
4. `title_issues_found`
5. `title_issues_cleared`
6. `escrow_opened`
7. `earnest_money_received`
8. `closing_disclosure_sent`
9. `closing_scheduled`
10. `closing_completed`
11. `recording_completed`
12. `disbursement_completed`

### Issue Flagging

Title updates support a `status` field with values: `completed`, `in_progress`, `blocked`, `issue_flagged`. When `title_issues_found` is submitted with `issue_flagged` status, the system surfaces this in the closing readiness blockers.

### Title Score

Title milestone progress feeds into the closing readiness title score:

| Milestone                | Score |
|--------------------------|-------|
| title_search_completed   | 25    |
| title_commitment_issued  | 50    |
| title_issues_cleared     | 65    |
| closing_disclosure_sent  | 80    |
| closing_scheduled        | 90    |
| closing_completed        | 100   |

---

## Closing Room

### Readiness Scoring Formula

Closing readiness is computed by `computeClosingReadiness()` and produces a weighted score from five categories:

| Category       | Weight | What it measures                                          |
|----------------|--------|-----------------------------------------------------------|
| Documents      | 25%    | Percentage of 5 required closing documents present        |
| Financing      | 25%    | Highest lender milestone achieved (see financing score)   |
| Title          | 20%    | Highest title milestone achieved (see title score)        |
| Checklist      | 15%    | Percentage of non-skipped checklist items completed       |
| Approvals      | 15%    | Percentage of approvals that have been decided            |

**Required closing documents**: `purchase_agreement`, `disclosure`, `title_commitment`, `closing_disclosure`, `proof_of_insurance`.

### Readiness States

| Score Range | State                |
|-------------|----------------------|
| 85-100      | `ready_for_closing`  |
| 65-84       | `nearly_ready`       |
| 40-64       | `at_risk`            |
| 0-39        | `not_ready`          |

### Blocker Tracking

The readiness record includes:
- `unresolved_blockers`: open critical/warning exceptions from `transaction_exceptions`.
- `missing_documents`: which of the 5 required document types are absent.
- `pending_items`: checklist items that are not completed or skipped.
- `target_closing_date` and `days_until_closing`: derived from the most recent closing-related timeline event.

---

## Deal Health Score

### Factor Weights

The health score is a broader measure of transaction risk, computed by `computeHealthScore()`:

| Factor          | Weight | Calculation                                               |
|-----------------|--------|-----------------------------------------------------------|
| Completeness    | 25%    | From `transaction_completeness.completeness_score`        |
| Timeliness      | 25%    | `100 - (overdue_checklist_items * 20)`, min 0             |
| Responsiveness  | 20%    | `100 - (overdue_obligations * 15)`, min 0                 |
| Compliance      | 15%    | `100 - (critical_exceptions * 25 + warning_exceptions * 10)`, min 0 |
| Financing       | 15%    | Highest lender milestone (expanded 7-point scale)         |

### Rating Thresholds

| Score Range | Rating     |
|-------------|------------|
| 80-100      | `healthy`  |
| 60-79       | `watch`    |
| 40-59       | `at_risk`  |
| 0-39        | `critical` |

### Risk Factors and Positive Signals

After computing each factor, the system populates explanatory arrays:

- **risk_factors**: any factor scoring below 50 is flagged with its name, a human-readable description, and an impact score (100 minus the factor value).
- **positive_signals**: any factor scoring above 80 is highlighted with its name and description.

### Trend Tracking

Each health score records the `previous_score` and computes a `score_trend`:

| Condition            | Trend        |
|----------------------|--------------|
| current - previous > 3  | `improving`  |
| current - previous < -3 | `declining`  |
| otherwise            | `stable`     |

If no previous score exists, the trend is `null`.

---

## Responsiveness Tracking

### Obligation Lifecycle

Response obligations track when external parties are expected to take action:

```
waiting -> responded  (via markResponded)
waiting -> overdue    (when expected_by passes without response)
waiting -> escalated  (via markEscalated)
waiting -> cancelled
overdue -> responded
overdue -> escalated
escalated -> responded
```

### Party Types

Obligations can be assigned to: `buyer`, `seller`, `lender`, `title`, `escrow`, `attorney`, `inspector`, `appraiser`, `other`.

### Aging and Escalation

- Each obligation records `requested_at` and optional `expected_by` timestamp.
- The `getResponsivenessReport()` function groups obligations by `party_type` and calculates:
  - Total, open, overdue, and responded counts per party.
  - Average response time in hours for responded obligations.
- Obligations past their `expected_by` date are considered overdue in reporting regardless of their explicit status.
- Manual escalation is available via `markEscalated()`.

---

## Daily Digest

### What's Included

The daily digest aggregates across all active transactions for a user's organization:

1. **Urgent deadlines**: checklist items due within 48 hours that are not completed/skipped.
2. **Blocked transactions**: transactions with open critical-severity exceptions.
3. **Pending approvals**: approvals in pending status for the organization.
4. **Missing documents**: document requests in `sent` or `viewed` status (not yet uploaded).
5. **Health risks**: transactions with `at_risk` or `critical` health ratings.
6. **Closing soon**: transactions with a target closing date within 7 days.
7. **Stale responses**: response obligations that have been waiting or overdue for 48+ hours.

### Preferences

Users configure their digest via `daily_digest_preferences`:

| Setting                     | Default             |
|-----------------------------|---------------------|
| `is_enabled`                | `true`              |
| `delivery_hour`             | `8` (8 AM)          |
| `timezone`                  | `America/New_York`  |
| `include_health_risks`      | `true`              |
| `include_deadlines`         | `true`              |
| `include_pending_approvals` | `true`              |
| `include_stale_responses`   | `true`              |
| `include_closing_soon`      | `true`              |

### Delivery

Digests are generated via `generateDigest()` and stored in the `daily_digests` table. The `email_sent` and `sent_at` fields track delivery status.

---

## Audit Export

### Sections Included

An audit export packages a transaction's full compliance record. Available sections:

| Section                    | Contents                                          |
|----------------------------|---------------------------------------------------|
| `summary`                  | Transaction details, property info, all parties   |
| `timeline`                 | All timeline events in chronological order        |
| `approvals`                | All approval records with decisions and notes     |
| `documents`                | Document metadata (name, type, size, status)      |
| `corrections`              | Field corrections linked to transaction documents |
| `exceptions`               | All exceptions with severity and resolution       |
| `closing_readiness`        | Latest readiness snapshot                         |
| `communications_metadata`  | Thread subjects and participant counts (no email body content) |

### Access Control

- Export requests require `broker_admin` role (the `canManageOrg` permission check).
- The `requested_by_user_id` is recorded for audit trail.
- Each export job is logged in the audit log with `audit_export.requested` and `audit_export.completed` actions.

### Format

Exports are currently generated as structured JSON and stored at a path like:
```
exports/{org_id}/{transaction_id}/{job_id}.json
```

Export jobs go through statuses: `pending` -> `processing` -> `completed` (or `failed`).

---

## Privacy: What External Collaborators CAN and CANNOT See

### CAN See

- Documents uploaded to the transaction (filtered by their `permissions.can_view_documents`).
- Their own status update history (lender milestones or title milestones, depending on role).
- Document request details addressed to them.
- General transaction status and closing readiness state (not internal scores).

### CANNOT See

- Internal team communications or email thread content.
- Other collaborators' status updates (a lender cannot see title updates and vice versa).
- Approval workflows, decision notes, or internal review comments.
- Field corrections or extraction details.
- Health scores, risk factors, or internal analytics.
- Audit exports.
- Other parties' contact information beyond what is in shared documents.

---

## Deferred Items

The following features are planned but not yet implemented:

1. **Actual email delivery for document requests and invites**: Currently, tokens are generated and stored but no transactional emails are sent. The `reminder_count` and `last_reminder_at` fields on document requests are scaffolded for future reminder emails.

2. **PDF export format**: The `export_format` column supports `'pdf'` as a value, but the `generateExport()` function currently produces JSON only. PDF rendering will require a template engine.

3. **External portal login**: External collaborators currently access the system via token-based links only. A dedicated login portal with email-based authentication (magic links or password) for collaborators who need ongoing access is not yet built.

4. **Automated obligation status transitions**: Obligations do not automatically transition from `waiting` to `overdue` when `expected_by` passes. This requires a scheduled job (cron or Inngest function) to update stale obligations.

5. **Digest email delivery**: Digest content is generated and stored, but the `email_sent` flag is never set to `true` because no email transport is connected. The preference `delivery_hour` and `timezone` are stored but not yet used by a scheduler.

6. **Collaborator permission enforcement in API routes**: The `permissions` JSONB on invites is stored and available for checks, but API-level middleware to enforce granular permissions (e.g., blocking upload when `can_upload_documents` is `false`) is not yet wired.

7. **Real-time notifications**: Collaborators and internal users do not receive push or WebSocket notifications when milestones are updated or documents are uploaded. Timeline events serve as the current notification mechanism (poll-based).
