import type { AgentNodeDefinition } from './types';
import { registerAgentNode } from './registry';

// ---------------------------------------------------------------------------
// 1. Next Best Action Planner
// ---------------------------------------------------------------------------
const nextBestActionPlanner: AgentNodeDefinition = {
  type: 'agent_next_best_action_planner',
  archetype: 'planner',
  label: 'Next Best Action Planner',
  description:
    'Analyzes transaction state and recommends the next actions to move the deal forward',
  system_prompt:
    'You are an expert real estate transaction coordinator analyzing deal state. Given transaction details, documents, checklist status, and timeline, recommend prioritized next actions. Focus on what is blocking closing, missing documents, approaching deadlines, and stalled stages. Always provide concrete, actionable steps rather than generic advice.',
  safety: {
    max_tokens: 1024,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 30_000,
    allowed_tools: [],
    blocked_actions: [],
    require_human_review: true,
    max_cost_cents: 10,
    confidence_threshold: 0.5,
    failure_fallback: 'escalate_to_human',
    memory_scope: 'workflow_context',
    pii_scrub: false,
  },
  input_schema: {
    transaction_id: { type: 'string', required: true, description: 'Unique identifier for the transaction' },
    transaction_summary: { type: 'object', required: true, description: 'Current state and details of the transaction' },
    checklist_status: { type: 'object', required: true, description: 'Status of all checklist items for the transaction' },
    timeline_events: { type: 'array', required: true, description: 'Ordered list of timeline events and upcoming deadlines' },
  },
  output_schema: {
    recommended_actions: { type: 'array', description: 'Prioritized list of {action, priority, reason, deadline_impact} objects' },
    confidence: { type: 'number', description: 'Confidence score between 0 and 1' },
    summary: { type: 'string', description: 'Human-readable summary of the analysis and recommendations' },
  },
};

// ---------------------------------------------------------------------------
// 2. Exception Triage Classifier
// ---------------------------------------------------------------------------
const exceptionTriageClassifier: AgentNodeDefinition = {
  type: 'agent_exception_triage_classifier',
  archetype: 'classifier',
  label: 'Exception Triage Classifier',
  description:
    'Classifies and prioritizes transaction/listing exceptions for coordinator review',
  system_prompt:
    'You are an experienced real estate exception handler. Classify exceptions by severity (critical, high, medium, low) and category (compliance, timeline, document, financial, stakeholder), then suggest a resolution approach. Be conservative with severity ratings — never downplay compliance-related exceptions, and always err on the side of escalation when regulatory requirements may be affected.',
  safety: {
    max_tokens: 512,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 15_000,
    allowed_tools: [],
    blocked_actions: ['resolve_exception'],
    require_human_review: true,
    max_cost_cents: 5,
    confidence_threshold: 0.6,
    failure_fallback: 'escalate_to_human',
    memory_scope: 'transaction_scoped',
    pii_scrub: false,
  },
  input_schema: {
    exception_description: { type: 'string', required: true, description: 'Description of the exception that occurred' },
    transaction_context: { type: 'object', required: true, description: 'Relevant transaction context surrounding the exception' },
    existing_exceptions: { type: 'array', required: false, description: 'List of existing exceptions on this transaction, if any' },
  },
  output_schema: {
    severity: { type: 'string', description: 'Severity level: critical, high, medium, or low' },
    category: { type: 'string', description: 'Exception category: compliance, timeline, document, financial, or stakeholder' },
    suggested_resolution: { type: 'string', description: 'Suggested approach to resolve the exception' },
    requires_escalation: { type: 'boolean', description: 'Whether the exception requires escalation to a supervisor' },
    confidence: { type: 'number', description: 'Confidence score between 0 and 1' },
  },
};

// ---------------------------------------------------------------------------
// 3. Document Classifier
// ---------------------------------------------------------------------------
const documentClassifier: AgentNodeDefinition = {
  type: 'agent_document_classifier',
  archetype: 'classifier',
  label: 'Document Classifier',
  description:
    'Classifies uploaded documents by type and extracts key metadata',
  system_prompt:
    'You are a real estate document specialist. Classify documents into standard types: purchase_agreement, disclosure, inspection_report, appraisal, title_report, insurance, amendment, addendum, correspondence, closing_document, or other. Extract key metadata such as dates, party names, amounts, and property identifiers. Note: all extracted data passes through human review in the approval pipeline before use.',
  safety: {
    max_tokens: 512,
    max_retries: 3,
    max_steps: 1,
    timeout_ms: 20_000,
    allowed_tools: [],
    blocked_actions: [],
    require_human_review: false,
    max_cost_cents: 5,
    confidence_threshold: 0.7,
    failure_fallback: 'use_default_output',
    memory_scope: 'step_local',
    pii_scrub: true,
  },
  input_schema: {
    document_text: { type: 'string', required: true, description: 'Extracted text content of the uploaded document' },
    file_name: { type: 'string', required: true, description: 'Original file name of the uploaded document' },
    transaction_type: { type: 'string', required: false, description: 'Type of transaction (e.g. residential_sale, commercial_lease) for classification hints' },
  },
  output_schema: {
    document_type: { type: 'string', description: 'Classified document type from the standard set' },
    confidence: { type: 'number', description: 'Confidence score between 0 and 1' },
    key_metadata: { type: 'object', description: 'Extracted metadata including dates, parties, amounts, and identifiers' },
    summary: { type: 'string', description: 'Brief summary of the document contents' },
  },
};

// ---------------------------------------------------------------------------
// 4. Offer Explanation
// ---------------------------------------------------------------------------
const offerExplanation: AgentNodeDefinition = {
  type: 'agent_offer_explanation',
  archetype: 'recommender',
  label: 'Offer Explanation',
  description:
    'Generates seller-friendly explanations of offer terms and comparisons',
  system_prompt:
    'You are a real estate advisor helping sellers understand offers. Explain offer terms in plain, non-technical language and compare offers by highlighting key differences in price, financing, contingencies, and timeline. Never make recommendations or suggest which offer to accept — only explain. Never reveal internal scoring, commission details, or agent-side analytics.',
  safety: {
    max_tokens: 1024,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 30_000,
    allowed_tools: [],
    blocked_actions: ['accept_offer', 'reject_offer'],
    require_human_review: true,
    max_cost_cents: 10,
    confidence_threshold: 0,
    failure_fallback: 'escalate_to_human',
    memory_scope: 'listing_scoped',
    pii_scrub: false,
  },
  input_schema: {
    offer_details: { type: 'object', required: true, description: 'Full details of the offer to explain' },
    listing_details: { type: 'object', required: true, description: 'Listing details including ask price, property info, and seller preferences' },
    comparison_offers: { type: 'array', required: false, description: 'Other offers to compare against, if available' },
  },
  output_schema: {
    explanation: { type: 'string', description: 'Plain-language explanation of the offer' },
    term_breakdown: { type: 'array', description: 'Array of {term, plain_language} objects breaking down each key term' },
    comparison_notes: { type: 'string', description: 'Side-by-side comparison notes if comparison offers were provided' },
    key_considerations: { type: 'array', description: 'List of important things for the seller to consider' },
  },
};

// ---------------------------------------------------------------------------
// 5. Communication Draft
// ---------------------------------------------------------------------------
const communicationDraft: AgentNodeDefinition = {
  type: 'agent_communication_draft',
  archetype: 'recommender',
  label: 'Communication Draft',
  description:
    'Drafts professional communications for agents and coordinators',
  system_prompt:
    'You are a professional real estate communication specialist. Draft emails, messages, and notifications for transaction parties while maintaining a professional tone and including all relevant dates, details, and context. Never make commitments or promises on behalf of agents or brokers, and always flag content that may need legal review before sending.',
  safety: {
    max_tokens: 1536,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 30_000,
    allowed_tools: [],
    blocked_actions: ['send_email', 'send_message'],
    require_human_review: true,
    max_cost_cents: 10,
    confidence_threshold: 0,
    failure_fallback: 'escalate_to_human',
    memory_scope: 'transaction_scoped',
    pii_scrub: false,
  },
  input_schema: {
    communication_type: { type: 'string', required: true, description: 'Type of communication: email, sms, notification, or letter' },
    recipient_role: { type: 'string', required: true, description: 'Role of the recipient: buyer, seller, agent, lender, title_company, inspector, etc.' },
    context: { type: 'object', required: true, description: 'Transaction context and details to include in the communication' },
    tone: { type: 'string', required: false, description: 'Desired tone of the communication (default: professional)' },
  },
  output_schema: {
    subject: { type: 'string', description: 'Subject line for the communication' },
    body: { type: 'string', description: 'Full body text of the drafted communication' },
    needs_legal_review: { type: 'boolean', description: 'Whether the content should be reviewed by legal before sending' },
    suggested_attachments: { type: 'array', description: 'List of suggested document attachments to include' },
  },
};

// ---------------------------------------------------------------------------
// 6. Compliance & Risk Critic
// ---------------------------------------------------------------------------
const complianceCritic: AgentNodeDefinition = {
  type: 'agent_compliance_critic',
  archetype: 'critic',
  label: 'Compliance & Risk Critic',
  description:
    'Reviews transaction data for compliance issues and risk factors',
  system_prompt:
    'You are a real estate compliance officer and risk analyst. Review transaction details for regulatory compliance issues, missing required disclosures, deadline violations, and financial anomalies. Be thorough and conservative — flag anything questionable rather than letting potential issues pass. Never approve, clear, or dismiss compliance issues; only identify and categorize them for human review.',
  safety: {
    max_tokens: 1024,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 30_000,
    allowed_tools: [],
    blocked_actions: ['clear_compliance', 'approve_transaction', 'override_policy'],
    require_human_review: true,
    max_cost_cents: 10,
    confidence_threshold: 0,
    failure_fallback: 'escalate_to_human',
    memory_scope: 'transaction_scoped',
    pii_scrub: false,
  },
  input_schema: {
    transaction_data: { type: 'object', required: true, description: 'Complete transaction data to review for compliance' },
    applicable_rules: { type: 'array', required: false, description: 'Specific compliance rules or regulations to check against' },
    jurisdiction: { type: 'string', required: false, description: 'Jurisdiction (state/county) for location-specific compliance rules' },
  },
  output_schema: {
    issues: { type: 'array', description: 'Array of {category, severity, description, regulation_ref, suggested_action} objects' },
    risk_level: { type: 'string', description: 'Overall risk level: low, medium, high, or critical' },
    summary: { type: 'string', description: 'Human-readable summary of compliance findings' },
    review_complete: { type: 'boolean', description: 'Whether the review covered all applicable rules' },
  },
};

// ---------------------------------------------------------------------------
// 7. Deal Router
// ---------------------------------------------------------------------------
const dealRouter: AgentNodeDefinition = {
  type: 'agent_deal_router',
  archetype: 'router',
  label: 'Deal Router',
  description:
    'Routes transactions to appropriate workflows and teams based on deal characteristics',
  system_prompt:
    'You are a transaction routing specialist. Analyze deal characteristics including type, value, complexity, and jurisdiction, then route to the appropriate workflow template and team. Consider team workload and specialization when making routing decisions. Never assign to specific individuals — only route to teams or roles.',
  safety: {
    max_tokens: 512,
    max_retries: 2,
    max_steps: 1,
    timeout_ms: 10_000,
    allowed_tools: [],
    blocked_actions: [],
    require_human_review: false,
    max_cost_cents: 5,
    confidence_threshold: 0.7,
    failure_fallback: 'use_default_output',
    memory_scope: 'workflow_context',
    pii_scrub: false,
  },
  input_schema: {
    transaction_summary: { type: 'object', required: true, description: 'Summary of the transaction including type, value, and parties' },
    available_workflows: { type: 'array', required: true, description: 'List of available workflow templates to route to' },
    team_capacity: { type: 'object', required: false, description: 'Current team workload and capacity information' },
  },
  output_schema: {
    recommended_workflow: { type: 'string', description: 'ID or name of the recommended workflow template' },
    recommended_team: { type: 'string', description: 'Team or role to handle this transaction' },
    confidence: { type: 'number', description: 'Confidence score between 0 and 1' },
    routing_factors: { type: 'array', description: 'List of factors that influenced the routing decision' },
  },
};

// ---------------------------------------------------------------------------
// Register all agent node definitions
// ---------------------------------------------------------------------------
registerAgentNode(nextBestActionPlanner);
registerAgentNode(exceptionTriageClassifier);
registerAgentNode(documentClassifier);
registerAgentNode(offerExplanation);
registerAgentNode(communicationDraft);
registerAgentNode(complianceCritic);
registerAgentNode(dealRouter);
