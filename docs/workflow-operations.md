# Workflow Operations

## How to Author Workflows

### Graph Model

A workflow is a directed acyclic graph (with the exception of explicit loop-back edges) stored as `WorkflowGraphData`. It consists of three arrays:

- **Nodes** -- Each node has an `id`, a `type` (from the `WorkflowNodeType` union), a human-readable `label`, a `config` object containing type-specific settings, a canvas `position`, `input_mapping` and `output_contract` dictionaries for data flow, an optional `retry_policy` (`{ max_retries, delay_ms }` or null), and an optional `timeout_ms`.
- **Edges** -- Each edge connects a `source_node_id` to a `target_node_id`. Edges may carry a `condition` expression (for branching), a display `label`, and an `order` integer for deterministic evaluation.
- **Triggers** -- Each trigger declares an `event_type` (one of the `WorkflowTriggerEventType` values such as `document_uploaded`, `transaction_status_changed`, `approval_decided`, `manual_trigger`, etc.) and an optional `event_filter` object that further constrains when the workflow fires.

### Node Categories

There are 30 valid node types, grouped into three categories:

**Control flow (8 types)**

| Type | Purpose |
|---|---|
| `start` | Entry point -- exactly one per workflow, no incoming edges |
| `stop` | Terminal node -- at least one required |
| `condition` | Evaluates an expression and routes to one of 2+ outgoing edges |
| `branch` | Parallel fan-out to 2+ paths |
| `wait` | Pauses execution for a duration (`wait_type: 'time'`) or until an event (`wait_type: 'event'`) |
| `loop` | Repeats a subgraph up to `max_iterations` times (1-100) with an `exit_condition` |
| `join` | Waits for all incoming parallel branches to complete before continuing |
| `human_checkpoint` | Blocks execution until a human reviews and approves |

**Domain operations (15 types)**

| Type | Purpose |
|---|---|
| `evaluate_transaction_completeness` | Recompute the completeness score for a transaction |
| `evaluate_listing_readiness` | Check whether a listing meets readiness criteria |
| `evaluate_closing_readiness` | Check whether a transaction is ready to close |
| `create_notification` | Send an in-app notification to specified users |
| `create_approval` | Create an approval request that blocks until decided |
| `create_checklist_item` | Add a checklist item to a transaction |
| `create_timeline_event` | Record a milestone event on the transaction timeline |
| `request_missing_document` | Notify the responsible party that a document is missing |
| `recompute_health_score` | Recalculate the health score for a transaction |
| `recompute_exceptions` | Re-evaluate exception rules and create/resolve exceptions |
| `transition_transaction_stage` | Move a transaction to a new stage |
| `transition_listing_stage` | Move a listing to a new stage |
| `handoff_accepted_offer` | Convert an accepted offer into a pending transaction |
| `emit_webhook` | POST a payload to an external URL |
| `send_digest` | Send a summary digest email |

**AI agent nodes (7 types)**

| Type | Archetype | Purpose |
|---|---|---|
| `agent_next_best_action_planner` | planner | Suggests the next action a coordinator should take |
| `agent_exception_triage_classifier` | classifier | Classifies and prioritizes exceptions |
| `agent_document_classifier` | classifier | Identifies the document type from content |
| `agent_offer_explanation` | recommender | Generates a human-readable explanation of an offer |
| `agent_communication_draft` | recommender | Drafts outbound messages |
| `agent_compliance_critic` | critic | Reviews a transaction for compliance issues |
| `agent_deal_router` | router | Routes a deal to the appropriate coordinator or team |

### Canvas Editor

The workflow editor uses a 3-column layout:

1. **Palette** (left) -- Lists available node types organized by category. Drag a node type onto the canvas to add it.
2. **Canvas** (center) -- Displays the graph visually. Nodes can be repositioned by dragging. Select a node to edit it in the config panel.
3. **Config panel** (right) -- Shows the selected node's type-specific configuration fields, retry policy, and timeout.

### Node Configuration

Each node type has its own config fields. Common configuration options include:

- **Type-specific fields** -- For example, a `wait` node requires `wait_type` (`'time'` or `'event'`), and either `duration_ms` or `event_type`. A `loop` node requires `max_iterations` (1-100) and `exit_condition`.
- **Retry policy** -- Optional `{ max_retries: number, delay_ms: number }` that controls automatic retries on failure.
- **Timeout** -- Optional `timeout_ms` that aborts the step if it exceeds the specified duration.

### Edge Creation

To create an edge between two nodes, **shift-click** the source node and then the target node. The edge will appear on the canvas. For condition/branch nodes, a condition expression or label can be set on each outgoing edge in the config panel.

### Triggers

Triggers define what events start a workflow run. Each trigger specifies an `event_type` (e.g. `document_uploaded`, `transaction_status_changed`, `approval_decided`, `manual_trigger`) and an optional `event_filter` object that narrows the trigger to specific conditions (e.g. only fire for transactions in a particular stage). When a version is published, its triggers are activated and any previously published version's triggers are deactivated.

---

## How to Use Bounded Agent Nodes

### Agent Archetypes

Agent nodes follow one of six archetypes that constrain their behavior:

- **Planner** -- Suggests a sequence of next steps. Output is an ordered action list.
- **Classifier** -- Assigns a category or priority label to an input. Output is a classification with confidence.
- **Recommender** -- Generates a human-readable recommendation or explanation. Output is prose or structured advice.
- **Extractor** -- Pulls structured fields from unstructured content. Output is a key-value map.
- **Critic** -- Reviews content for issues or compliance violations. Output is a list of findings.
- **Router** -- Decides which person or team should handle a work item. Output is an assignment.

### Concrete Agent Node Types

1. **`agent_next_best_action_planner`** (planner) -- Analyzes a transaction's current state and suggests the highest-priority next action for the coordinator. Requires human review.
2. **`agent_exception_triage_classifier`** (classifier) -- Takes an exception and classifies its severity and category. Uses transaction-scoped memory.
3. **`agent_document_classifier`** (classifier) -- Examines document content and assigns a document type. Uses step-local memory (no cross-step context).
4. **`agent_offer_explanation`** (recommender) -- Generates a plain-language summary of an offer's terms, comparisons, and implications. Uses listing-scoped memory.
5. **`agent_communication_draft`** (recommender) -- Drafts an outbound email or message based on context and templates.
6. **`agent_compliance_critic`** (critic) -- Reviews a transaction for regulatory compliance issues and flags violations. Requires human review.
7. **`agent_deal_router`** (router) -- Routes a deal to the appropriate coordinator based on workload, expertise, and geography. Does not require human review.

### Safety Constraints

Every agent node carries a safety configuration with these fields:

| Field | Description |
|---|---|
| `max_tokens` | Maximum tokens the agent may consume in a single invocation |
| `max_steps` | Maximum reasoning steps (>= 1) |
| `timeout_ms` | Hard timeout for the agent call |
| `allowed_tools` | List of tools the agent may invoke (currently `[]` for all agents -- reasoning only) |
| `blocked_actions` | Action strings that must not appear in output (e.g. `delete_transaction`) |
| `require_human_review` | When true, the step output is held for human approval before the run continues |
| `max_cost_cents` | Spending cap per invocation |
| `confidence_threshold` | Minimum confidence (0-1) for the output to be accepted automatically. If confidence is below this threshold, the output is rejected. A threshold of 0 accepts all. Null confidence (not reported) is always accepted. |
| `failure_fallback` | Strategy when the agent fails (see below) |
| `memory_scope` | Controls how much workflow context the agent can see (see below) |
| `pii_scrub` | Whether to strip PII from agent input/output |
| `max_retries` | Number of automatic retries on transient failure |

### Circuit Breaker

Each agent node type has an in-memory circuit breaker that prevents cascading failures:

1. **Closed** (normal) -- Requests pass through. Each failure increments `failure_count`.
2. **Open** -- After **5 consecutive failures**, the circuit opens. All requests are immediately rejected.
3. **Cooldown** -- The circuit stays open for **60 seconds** (`cooldown_until` timestamp).
4. **Half-open** -- After the cooldown expires, the next request is allowed through as a probe. A success closes the circuit; a failure reopens it.

Circuit breaker state is per-agent-type and resets on process restart (see Known Limitations).

### Memory Scopes

Memory scope controls how much of the workflow's runtime context is visible to the agent:

| Scope | Behavior |
|---|---|
| `step_local` | Agent sees no prior context -- empty object. Used for stateless classification. |
| `workflow_context` | Agent sees the full workflow execution context. |
| `transaction_scoped` | Agent sees only keys containing `transaction` (e.g. `transaction`, `transaction_id`). |
| `listing_scoped` | Agent sees only keys containing `listing` (e.g. `listing`, `listing_id`). |

### Fallback Strategies

When an agent node fails (timeout, error, confidence below threshold), the `failure_fallback` field determines what happens:

| Strategy | Behavior |
|---|---|
| `use_default_output` | Use a predefined default output and continue the run |
| `escalate_to_human` | Pause the run and create a human review task |
| `skip` | Skip this step and continue to the next node |
| `abort_run` | Terminate the entire workflow run with an error |

### Tool Use

All agent nodes currently have `allowed_tools: []`, meaning they operate in **reasoning-only mode**. They receive context, produce structured output, but cannot invoke external tools or APIs. Tool-calling support is planned for a future release.

---

## How to Debug Runs

### Run Detail Page

Each workflow run has a detail page showing:

- **Status** -- Current run status (running, completed, failed, paused, cancelled).
- **Steps timeline** -- A vertical timeline of every executed step, in order. Each step shows its node type, duration, and status.
- **Duration** -- Total wall-clock time from start to completion (or current elapsed time for in-progress runs).
- **Error messages** -- For failed steps, the error message and stack context are displayed inline.

### Agent Node Inspector

When viewing an agent node step, an expanded inspector panel shows:

- **Confidence** -- The agent's self-reported confidence score (0-1), or null if not reported.
- **Token usage** -- Prompt tokens, completion tokens, and total tokens consumed.
- **Safety flags** -- Any violations detected by `validateAgentOutput` (e.g. blocked action references, token limit exceeded, confidence below threshold).
- **Output JSON** -- The raw structured output from the agent, displayed as formatted JSON.

### Run Controls

From the run detail page, operators can:

- **Pause** -- Suspend a running workflow at the current step boundary.
- **Resume** -- Continue a paused run from where it stopped.
- **Cancel** -- Terminate the run immediately. In-progress steps are marked as cancelled.
- **Re-run** -- Create a new run using the same trigger context and graph version.
- **Step override** -- Manually set the output of a failed or paused step and continue the run.

### Failure Paths

When a step fails:

- The failed step is highlighted with a **red border** on the timeline.
- Subsequent steps that were never reached are shown as **skipped** (grayed out).
- The run status changes to `failed` unless the failure was handled by a fallback strategy.
- For agent nodes, the fallback strategy (`escalate_to_human`, `skip`, `use_default_output`, or `abort_run`) determines whether the run continues or stops.

---

## How to Publish Safely

### Workflow Lifecycle

A workflow version moves through these statuses:

1. **`draft`** -- Initial state. The graph can be freely edited.
2. **`validating`** -- The system is running graph validation (structure checks, node config checks).
3. **`validated`** -- Validation passed. The version is eligible for publishing.
4. **`published`** -- The version is live. Its triggers are active. Only one version per workflow can be published at a time.
5. **`archived`** -- A previously published version that has been superseded or manually archived.

### Publish Governance

Publishing requires the `broker_admin` role. Before confirming a publish, the system runs `getPublishWarnings()` and displays any warnings:

| Condition | Warning |
|---|---|
| Workflow contains agent nodes (`agent_*`) | "This workflow contains AI agent nodes that will execute automatically." |
| Workflow contains `human_checkpoint` nodes | "This workflow includes human checkpoints that will block execution until reviewed." |
| Workflow has no `condition` or `branch` nodes | "This workflow has no branching logic -- all paths are unconditional." |
| Workflow has more than 15 nodes | "This workflow has many nodes (N). Consider simplifying." |
| Workflow contains `transition_transaction_stage` or `transition_listing_stage` | "This workflow can automatically transition stages." |

The publisher must acknowledge all warnings before the publish proceeds.

### Version Comparison

Before publishing, you can view a diff between any two versions. The diff service compares the graph data and reports:

- **Nodes added** -- Nodes present in the new version but not the old.
- **Nodes removed** -- Nodes present in the old version but not the new.
- **Nodes modified** -- Nodes present in both but with changed label, type, or config.
- **Edges added** -- Edges present in the new version but not the old.
- **Edges removed** -- Edges present in the old version but not the new.

### Rollback

To roll back to a previous version, find the archived version in the version history and republish it. This creates no new version -- it promotes the archived version back to `published` status and archives the currently published version. The process follows the same governance checks (validation + publish warnings + broker_admin role).

---

## Known Limitations

- **Agent nodes are reasoning-only** -- No tool calling yet. All agents have `allowed_tools: []`.
- **Circuit breaker state is in-memory** -- Resets on process restart. A distributed circuit breaker (e.g. Redis-backed) is planned.
- **No workflow scheduling** -- Workflows can only be triggered by events or manual trigger. Cron-style scheduling is not yet supported.
- **No workflow sharing between organizations** -- Each workflow belongs to a single organization. Cross-org templates are not supported.
- **Agent step summaries stored in generic `output_data`** -- There is no dedicated table for agent reasoning traces. Summaries are serialized into the step's generic `output_data` JSON column.
- **Max 500 steps per run** -- A depth guard prevents runaway workflows. Runs exceeding 500 steps are terminated.
- **No natural language workflow generation** -- Workflows must be authored manually in the canvas editor. AI-assisted generation from natural language descriptions is planned.
