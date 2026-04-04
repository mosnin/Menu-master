# Analytics Layer

## Event Taxonomy

All product events are stored in `product_events` with a category and event name. The canonical list lives in `lib/analytics/events.ts`.

| Category | Events | When they fire |
|---|---|---|
| **activation** | `organization_setup_started`, `organization_setup_completed`, `first_login`, `pilot_readiness_viewed`, `getting_started_viewed`, `getting_started_step_completed` | Org onboarding and first-use flow |
| **transaction** | `transaction_created`, `transaction_status_changed`, `transaction_viewed`, `transaction_list_viewed` | Transaction CRUD and navigation |
| **document** | `document_uploaded`, `document_extraction_completed`, `document_extraction_failed`, `document_viewed` | Document upload and extraction pipeline |
| **extraction** | `extraction_reviewed`, `extraction_field_viewed` | User reviews extracted fields |
| **correction** | `extraction_field_corrected`, `correction_locked` | User corrects an extracted value or locks it |
| **completeness** | `completeness_recomputed`, `completeness_viewed` | Completeness score recalculated or viewed |
| **queue** | `queue_viewed`, `queue_item_opened`, `queue_filtered` | Queue interactions |
| **approval** | `approval_requested`, `approval_approved`, `approval_rejected`, `approval_viewed` | Approval lifecycle |
| **communication** | `outbound_message_sent`, `email_account_connected`, `email_thread_linked`, `communication_reply_ingested` | Email and messaging |
| **recommendation** | `recommendation_shown`, `recommendation_executed`, `recommendation_dismissed`, `recommendation_feedback_given` | AI recommendation lifecycle |
| **exception** | `exception_created`, `exception_resolved`, `exception_feedback_given` | Exception handling |
| **feedback** | `feedback_submitted`, `issue_reported` | User feedback and bug reports |
| **configuration** | `rule_created`, `rule_toggled`, `template_created`, `template_applied` | Admin configuration changes |
| **navigation** | `dashboard_viewed`, `settings_viewed` | Page views |

## Activation Milestones

Defined in `lib/analytics/milestones.ts`. Each milestone is recorded once per org (upsert, deduplicated on `organization_id, user_id, milestone`).

| # | Milestone | Description |
|---|---|---|
| 1 | `first_login` | A user from this org logged in for the first time |
| 2 | `setup_completed` | Organization setup wizard finished |
| 3 | `first_transaction` | First transaction created |
| 4 | `first_document_upload` | First document uploaded to any transaction |
| 5 | `first_extraction_success` | First successful document extraction |
| 6 | `first_correction` | First field correction made |
| 7 | `first_approval_completed` | First approval approved or rejected |
| 8 | `first_reminder_sent` | First outbound reminder/message sent |
| 9 | `first_email_connected` | Email account connected |
| 10 | `first_recommendation_executed` | First AI recommendation executed |
| 11 | `first_live_transaction` | First transaction moved to "active" status |

## Key Metrics

All computed in `lib/analytics/metrics.ts` via `getOrgMetrics(orgId)`.

- **Activation funnel** -- Per-org progress through the 11 milestones above. Queried via `getActivationFunnel(orgId)`.
- **Transaction volume** -- Total count and breakdown by status (draft, active, pending_closing, closed, cancelled).
- **Document processing** -- Total count and breakdown by processing_status (pending, processing, completed, failed, etc.).
- **Approval turnaround** -- Average milliseconds between `created_at` and `decided_at` for decided approvals. Returns `null` when no approvals have been decided.
- **Exception distribution** -- Counts by severity (high/medium/low), resolution_status, and exception_type.
- **Recommendation performance** -- Execution rate (executed / total) and dismiss rate (dismissed / total).
- **Correction hotspots** -- Top corrected field names, ranked by frequency. Queried via `getCorrectionHotspots(orgId)`.
- **Queue aging** -- Number of overdue checklist items, average days overdue, pending approval count, average hours pending. Queried via `getQueueAging(orgId)`.
- **Feedback summary** -- Thumbs up/down counts grouped by feature area. Queried via `getFeedbackSummary(orgId)`.

## How to Query

### Activation funnel for an org

```sql
SELECT milestone, achieved_at
FROM activation_milestones
WHERE organization_id = '<org_id>'
ORDER BY achieved_at ASC;
```

### Event volume by day

```sql
SELECT
  DATE(created_at) AS day,
  event_category,
  COUNT(*) AS count
FROM product_events
WHERE organization_id = '<org_id>'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY day, event_category
ORDER BY day DESC;
```

### Correction hotspot report

```sql
SELECT
  efv.field_name,
  COUNT(*) AS correction_count
FROM field_corrections fc
JOIN extracted_field_values efv ON efv.id = fc.field_value_id
JOIN documents d ON d.id = efv.document_id
JOIN transactions t ON t.id = d.transaction_id
WHERE t.organization_id = '<org_id>'
GROUP BY efv.field_name
ORDER BY correction_count DESC
LIMIT 20;
```

### Recommendation execution rate

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'executed') AS executed,
  COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE status = 'executed')::numeric / NULLIF(COUNT(*), 0), 3) AS execution_rate
FROM transaction_recommendations tr
JOIN transactions t ON t.id = tr.transaction_id
WHERE t.organization_id = '<org_id>';
```

### Approval turnaround

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (decided_at - created_at))) / 3600 AS avg_hours
FROM approvals
WHERE organization_id = '<org_id>'
  AND decided_at IS NOT NULL;
```

## Internal Analytics Dashboard

- **URL:** `/analytics`
- **Access:** `broker_admin` role only. Non-admins are redirected to `/dashboard`.
- **Tabs:**
  - **Overview** -- Transaction, document, approval, exception, and feedback summary counts.
  - **Activation Funnel** -- Visual progress through the 11 milestones.
  - **Correction Hotspots** -- Top corrected fields with counts.
  - **Queue Aging** -- Overdue items and pending approval stats.
  - **Recommendation Performance** -- Execution and dismiss rates.
  - **Feedback** -- Recent feedback entries and summary by feature area.

## Privacy

What is **not** tracked:

- No raw email or document content in events. Event properties contain only metadata: IDs, counts, field names, status values.
- No secrets or credentials are logged.
- Feedback body text is user-submitted (explicit opt-in), not scraped or auto-captured.
- Analytics data is scoped per organization. The `/analytics` page is restricted to `broker_admin` users.

## What to Watch First

The top 5 metrics to monitor during pilot:

1. **Activation funnel completion** -- Are pilot orgs reaching `first_live_transaction`? If they stall at `first_document_upload`, onboarding needs work.
2. **Correction hotspots** -- Which fields are users fixing most? High correction rates on specific fields signal extraction model issues or template mismatches.
3. **Recommendation execution rate** -- Are users trusting AI suggestions? Low execution + high dismiss = recommendations need tuning.
4. **Approval turnaround** -- Long turnaround times indicate bottlenecks in the review process.
5. **Queue aging (overdue items)** -- Growing overdue counts mean users are falling behind or the checklist is too aggressive.
