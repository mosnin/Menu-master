# Deal Orchestrator Architecture

## Overview

The Deal Orchestrator is a bounded agentic layer that observes deal state, identifies blockers and risk, proposes or executes safe actions, and escalates risky actions to humans. It is **not** a chatbot or open-ended autonomous system.

Each active listing or transaction can have a persistent orchestrator that acts as an operations brain for that deal.

## Core Architecture

### Planner → Critic → Executor

```
World State + Memory → Planner → Proposed Actions → Critic → Approved Actions → Executor → Results
```

1. **Planner** — Takes world state and memory, proposes next actions using available tools
2. **Critic** — Reviews proposals for risk, confidence, contradictions, and compliance
3. **Executor** — Performs only approved safe actions; gates medium/high risk

### Observation Loop

The orchestrator runs observation cycles when:
- **Scheduled** — Every 30 minutes for active orchestrators (debounced to avoid churn)
- **Event-triggered** — Document uploads, approval changes, stage changes, communications
- **Deadline checks** — Daily at 8 AM for approaching deadlines
- **Manual** — User-triggered from the UI

Each cycle: capture world state → check for changes → plan → critique → execute → update next actions.

## Data Model

### deal_orchestrators
Persistent record for each deal. Tracks status, priority, risk summary, and cycle timestamps.

### orchestrator_world_states
Point-in-time snapshots of deal state. Includes stage, completeness, exceptions, missing docs, approvals, obligations, deadlines, assignments, compliance flags, and health scores. State hash enables efficient change detection.

### orchestrator_memory_entries
Structured memory that influences future planning:
- **blocker** — Unresolved blockers
- **action_taken** — Recent orchestrator actions
- **recommendation_given/outcome** — Track whether recommendations were acted on
- **failure_pattern** — Repeated failures
- **counterparty_signal** — Responsiveness signals
- **human_correction** — Important overrides by humans
- **pending_decision** — Waiting for human input
- **obligation** — Active obligations
- **escalation** — Escalation records

### orchestrator_cycles
Full record of each observe-plan-execute cycle with trigger, world state reference, planner output, critic evaluation, and execution summary.

### orchestrator_action_proposals
Individual proposed actions from the planner with risk class, confidence, critic approval, and status.

### orchestrator_action_executions
Records of actually executed actions with results, side effects, duration, and idempotency keys.

### orchestrator_next_actions
First-class UI output: title, reason, urgency, risk, owner, prerequisites, source signals, auto-executable flag, and freshness tracking.

### orchestrator_obligations
Active obligations being tracked: what's needed, who owns it, when it's due, current status.

## Action Risk Classes

| Class | Behavior | Examples |
|-------|----------|----------|
| **safe** | Auto-execute | recompute_completeness, create_notification, create_timeline_event |
| **medium_risk** | Create draft/approval | create_reminder_draft, create_document_request, assign_owner |
| **high_risk** | Human approval required | suggest_stage_transition |

### Gating Rules
- Safe actions: auto-execute immediately
- Medium-risk with confidence >= 0.7: create draft/suggestion
- Medium-risk with confidence < 0.7: require human review
- High-risk: always require human approval
- Actions on closed/cancelled entities: rejected
- Active compliance flags: escalate medium_risk to high_risk

## Tool Registry

16 registered tools, each with:
- Strongly typed contract (name, description, risk class, params schema)
- Permission-aware execution (role hierarchy: agent → coordinator → broker_admin)
- Integration with existing domain services (no duplicated business logic)
- Audit logging for all executions
- Idempotency support where practical

### Safe Tools
`recompute_completeness`, `recompute_exceptions`, `recompute_health_score`, `create_notification`, `create_checklist_item`, `create_timeline_event`, `request_manual_review`, `mark_counterparty_waiting`, `create_next_action_card`

### Medium-Risk Tools
`create_reminder_draft`, `create_document_request`, `assign_owner`, `assign_task`, `create_approval_request`, `suggest_follow_up_draft`

### High-Risk Tools
`suggest_stage_transition`

## World State Model

Aggregated from existing canonical services and tables:

| Signal | Source |
|--------|--------|
| Stage & readiness | transactions/listings tables + completeness service |
| Completeness score | transaction_completeness table |
| Health score & rating | deal_health_scores table |
| Unresolved exceptions | transaction_exceptions / listing_exceptions |
| Missing documents | documents table + required doc type rules |
| Pending approvals | approvals table |
| Recent communications | communication_messages (7-day window) |
| Open/overdue obligations | response_obligations table |
| Assignments & ownership | transaction_assignments table |
| Urgent deadlines | checklist_items (7-day window) |
| Compliance flags | compliance_issues table |
| Economics summary | transaction_economics table |

## Memory Model

### Retention Rules
- Unresolved entries: kept indefinitely
- Resolved entries: kept for 30 days, then compacted
- Maximum 20 unresolved entries per orchestrator before compaction triggers

### Influence on Planning
- Unresolved blockers → prioritized in planner context
- Failure patterns → reduce confidence in similar actions
- Human corrections → override automatic behavior
- Ignored recommendations → avoid repeating same suggestion
- Counterparty signals → inform waiting state and follow-up urgency

## Inspection Surfaces

### Orchestrator Status Card
Shows active/paused status, last observed time, cycle count, priority, and risk summary.

### Next Actions Panel
Primary action highlighted with title, reason, urgency, risk class, owner, and auto-executable indicator. Supporting actions listed below. Dismiss and resolve controls.

### Reasoning Summary
Recent orchestrator cycles with trigger type, reasoning summary, actions proposed/executed, and critic evaluation.

### Agent Activity Feed
Recent tool executions with success/failure, risk class, and side effects.

## Safety & Permissions

- All orchestrators are org-scoped
- Actions cannot cross org boundaries
- Existing role and permission checks apply to all tool executions
- External communications remain gated by approval system
- Compliance and stage changes do not bypass current controls
- Traces do not reveal restricted data to unauthorized users
- All orchestrator activity is audit logged

## Inngest Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `orchestrator-scheduled-observation` | Every 30 min | Run cycles for active orchestrators |
| `orchestrator-event-observation` | Event-driven | React to domain events (debounced 2 min) |
| `orchestrator-deadline-check` | Daily 8 AM | Find approaching deadlines |
| `orchestrator-stale-action-cleanup` | Hourly | Mark stale actions and overdue obligations |

## Action Policy Engine

The executor uses a deterministic policy engine to evaluate every proposed action before execution.

### Policy Dispositions

| Disposition | Behavior | When |
|------------|----------|------|
| **auto_execute** | Execute immediately | Safe tools on active deals |
| **create_draft** | Prepare for review | Medium-risk + confidence >= 0.7 |
| **create_approval** | Route to approval queue | Medium-risk + low confidence, compliance flags |
| **block** | Blocked, escalation created | High-risk, closed deals, org policy |

### Policy Rules (Precedence Order)

1. Closed/cancelled entities → block
2. Org `demoted_to_blocked` → block
3. High risk → block (escalate to broker_admin)
4. Compliance flags + non-safe → create_approval
5. Org `require_approval_for` → create_approval
6. Medium risk + confidence < 0.7 → create_approval
7. Medium risk + confidence >= 0.7 → create_draft
8. Org `promoted_to_safe` → auto_execute
9. Safe → auto_execute
10. Unknown tool → block

### Org Policy Overrides

Organizations can customize policy via `orchestrator_action_policies`:
- `promoted_to_safe[]` — promote medium-risk tools to auto-execute
- `demoted_to_blocked[]` — block specific tools
- `require_approval_for[]` — force approval for any tool

## Follow-Through Sequences

Bounded multi-step autonomous patterns that execute across multiple cycles.

### Built-in Sequences

| Sequence | Trigger | Steps | Max Duration |
|----------|---------|-------|-------------|
| Missing Document | Missing doc in world state | Flag → Checklist → Notify → Wait 24h → Reminder draft | 72h |
| Stale Approval | Approval pending > 48h | Notify → Wait 24h → Escalation card → Manual review | 96h |
| Completeness Recovery | Score < 50% | Recompute → Exceptions → Action card → Notify | 48h |
| Post-Document Upload | Document uploaded event | Recompute completeness → Exceptions → Health → Clear stale | 1h |

### Sequence Rules
- Maximum 5 steps per sequence
- Explicit exit conditions required
- Cancellable (except immediate sequences)
- Step results tracked in DB
- Duplicate sequences suppressed per orchestrator

## Expanded Safe Tools

| Tool | Purpose |
|------|---------|
| `recompute_listing_readiness` | Listing completeness evaluation |
| `recompute_closing_readiness` | Closing readiness assessment |
| `clear_stale_outputs` | Clear superseded next actions |
| `create_internal_task` | Auto-assigned checklist items |
| `update_waiting_state` | Detailed counterparty waiting info |

Total tools: **21** (14 safe, 6 medium-risk, 1 high-risk)

## Execution Monitoring

### Inspection Surfaces

- **Execution Monitor** — Chronological feed of auto/draft/blocked actions
- **Policy Trace** — Inspectable policy evaluation for each action
- **Follow-Through Panel** — Sequence progress with step tracking
- **Disposition Badges** — Green (auto), amber (draft), red (blocked) on all surfaces

## Deferred Items

1. **Listing-specific world state** — Currently simplified; needs listing completeness service
2. **Memory compaction automation** — Manual thresholds defined; automated cleanup TBD
3. **Cross-deal pattern learning** — Single-deal orchestrators only; no cross-deal intelligence yet
4. **Orchestrator configuration UI** — Config stored but no admin UI for tuning
5. **Observation frequency tuning** — Fixed schedules; adaptive frequency deferred
6. **Tool chain composition** — Tools execute independently; multi-step tool chains deferred
