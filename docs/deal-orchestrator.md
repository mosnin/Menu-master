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

## Learning and Adaptation Layer

The orchestrator learns from outcomes, corrections, ignored actions, counterparty behavior, and specialist effectiveness to improve over time.

### Core Principles
- Learn from outcomes, not vibes
- Hard policy and safety rules are always stronger than learned preferences
- Learning tunes prioritization and routing, never silently rewrites governance
- Every learned signal is inspectable
- Organization-scoped learning only — no cross-org leakage

### Outcome Tracking
- Records structured outcomes after each execution cycle
- Outcome types: blocker_resolved, deadline_protected, document_received, approval_completed, response_received, readiness_improved, plan_progressed, no_meaningful_effect, negative_effect
- Pre/post world state comparison for automatic outcome detection
- Links outcomes to proposals, executions, plans, and specialist traces

### Action Effectiveness Scoring
- Aggregated scores per tool, per context (entity type, stage, blocker type, counterparty type)
- Weighted formula: (successful - negative) / total, with decay factor
- Low-effectiveness actions get deprioritized in planner context
- Frequently ignored actions penalized in planning

### Recommendation Feedback
- Tracks human responses: accepted, ignored, dismissed, superseded, edited
- Repeatedly ignored tools get noted in planner and critic context
- Edited recommendations inform future confidence levels

### Correction Pattern Learning
- Tracks correction categories: extraction fields, checklist items, timeline dates, document types, risk classifications, urgency assessments, specialist routing
- Patterns require 2+ occurrences before influencing decisions (no overgeneralization)
- Suggested actions: lower_confidence, request_manual_review, add_specialist_review, flag_for_attention
- Organization-scoped, bounded confidence adjustments (-0.5 to 0)

### Counterparty Behavior Learning
- Tracks response times, missed deadlines, early responses for each counterparty type
- Aggregated profiles: avg/median/p90 response hours, missed deadline rate
- Adjusts escalation timing: -24h for unreliable, +12h for reliable counterparties
- Urgency boost: +1 to +3 for slow/unreliable counterparties

### Specialist Contribution Scoring
- Tracks usefulness per specialist role and context
- Metrics: useful invocations, findings-led-to-action, findings-improved-outcome
- Priority adjustments (-3 to +3) applied to specialist routing
- Low-usefulness specialists can be skipped (< 0.2 score, >= 10 invocations)

### Organization Adaptation Profiles
- Per-org learning profiles with: escalation timing, compliance sensitivity, urgency bias
- Common blocker types, commonly ignored actions, successful/failure patterns
- Confidence threshold adjustments, specialist routing sensitivity
- All profiles inspectable and org-isolated

### Memory Summarization
- Compacts repeated patterns into summaries (action patterns, blocker patterns, recovery patterns, etc.)
- Minimum 3 occurrences to form a pattern
- Relevance scoring with decay over time
- Active summaries capped at 20 per orchestrator
- Enriched memory combines raw recent entries with summarized patterns

### Pipeline Integration
- Learning context built at cycle start and passed to planner, critic, and router
- Planner receives: effective/ineffective tools, ignored actions, correction patterns, counterparty profiles, learned memory patterns
- Critic adds concerns for low-effectiveness tools, ignored actions, correction patterns
- Critic flags human review for strict-review orgs and high-compliance sensitivity
- Specialist router applies learned priority adjustments (bounded -3 to +3)
- Outcome detection runs after each execution cycle

### Hard Policy vs Learned Heuristics
- Risk classification (safe/medium/high) cannot be changed by learning
- Compliance rules always override learned preferences
- Approval requirements cannot be bypassed
- Permission boundaries are unaffected
- Learning only tunes: ranking, sequencing, timing, urgency, routing

### Inspection Surfaces
- **Learning Insights** — Shows active learning signals influencing the current cycle
- **Org Adaptation Profile** — Displays learned org preferences and patterns
- **Memory Patterns** — Shows compacted memory summaries with relevance scores
- Human-readable explanations: "prioritized because similar actions resolved this before"

### Data Model
- `orchestrator_outcomes` — Structured outcome records with impact scores
- `orchestrator_action_scores` — Aggregated effectiveness per tool per context
- `orchestrator_recommendation_feedback` — Human response tracking
- `orchestrator_correction_patterns` — Learned correction patterns
- `orchestrator_counterparty_signals` — Raw counterparty behavior signals
- `orchestrator_counterparty_profiles` — Aggregated counterparty profiles
- `orchestrator_specialist_scores` — Specialist usefulness scoring
- `orchestrator_org_profiles` — Organization adaptation profiles
- `orchestrator_memory_summaries` — Compacted memory patterns
- `orchestrator_learning_events` — Audit trail for all learning updates

## Deferred Items

1. **Listing-specific world state** — Currently simplified; needs listing completeness service
2. **Cross-deal pattern learning** — Single-deal orchestrators only; no cross-deal intelligence yet
3. **Orchestrator configuration UI** — Config stored but no admin UI for tuning
4. **Observation frequency tuning** — Fixed schedules; adaptive frequency deferred
5. **Tool chain composition** — Tools execute independently; multi-step tool chains deferred
6. **Deferred outcome measurement** — Currently measures outcomes immediately; T+1h / T+24h deferred measurement would improve accuracy
7. **Counterparty identity resolution** — Counterparty profiles keyed by type, not individual identity; per-individual tracking deferred
8. **Automated profile refresh** — Org profiles updated on demand; automated batch aggregation deferred
9. **Learning confidence intervals** — Scores are point estimates; confidence intervals deferred
