// =============================================================================
// Real Estate Deal Desk - Domain Types
// =============================================================================

// -----------------------------------------------------------------------------
// Enum-like union types (mirrors TEXT CHECK constraints in the database)
// -----------------------------------------------------------------------------

export type TransactionStatus =
  | 'draft'
  | 'active'
  | 'pending_closing'
  | 'closed'
  | 'cancelled';

export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'ocr_required'
  | 'manual_review';

export type ChecklistItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'needs_review';

export type ChecklistItemSource = 'manual' | 'ai_generated' | 'template';

export type TimelineEventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type TimelineEventSource = 'system' | 'ai_generated' | 'manual';

export type ApprovalType =
  | 'outbound_email'
  | 'extraction_review'
  | 'checklist_review';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type MessageStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'snoozed';

export type ReminderType =
  | 'deadline_approaching'
  | 'overdue'
  | 'action_required'
  | 'follow_up';

export type ContactType =
  | 'buyer'
  | 'seller'
  | 'agent'
  | 'broker'
  | 'lender'
  | 'title_company'
  | 'inspector'
  | 'appraiser'
  | 'other';

export type UserRole = 'agent' | 'coordinator' | 'broker_admin';

export type ActorType = 'user' | 'system' | 'ai';

export type DocumentType = string; // Free-form; no fixed set of values

export type EventType = string; // Free-form; no fixed set of values

// Phase 2 union types

export type ReadinessState =
  | 'not_ready'
  | 'needs_attention'
  | 'nearly_ready'
  | 'ready';

export type ExceptionSeverity = 'info' | 'warning' | 'critical';

export type ExceptionResolutionStatus = 'open' | 'acknowledged' | 'resolved';

export type RecommendationStatus = 'pending' | 'executed' | 'dismissed';

export type CommentEntityType = 'transaction' | 'document' | 'approval' | 'checklist_item';

export type CommunicationProvider = 'google' | 'microsoft';

export type MessageDirection = 'inbound' | 'outbound';

export type SyncStatus = 'active' | 'paused' | 'error' | 'disconnected';

export type LinkedBy = 'auto' | 'manual';

export type PacketIngestionStatus =
  | 'pending'
  | 'processing'
  | 'classifying'
  | 'completed'
  | 'failed';

// -----------------------------------------------------------------------------
// Database row types
// -----------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  auth0_user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_profile_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  title: string;
  status: TransactionStatus;
  stage: TransactionStage;
  property_id: string | null;
  created_by_user_id: string;
  office_id: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  contact_type: ContactType;
  created_at: string;
  updated_at: string;
}

export interface TransactionParty {
  id: string;
  transaction_id: string;
  contact_id: string;
  role: string;
  created_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  transaction_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  uploaded_by_user_id: string;
  processing_status: ProcessingStatus;
  document_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extraction_version: number;
  raw_model_output_json: Record<string, unknown> | null;
  normalized_data_json: Record<string, unknown> | null;
  confidence_score: number | null;
  extracted_at: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  items: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  transaction_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ChecklistItemStatus;
  source: ChecklistItemSource;
  requires_review: boolean;
  completed_at: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  transaction_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  event_date: string | null;
  status: TimelineEventStatus;
  source: TimelineEventSource;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  organization_id: string;
  transaction_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  requested_by_user_id: string;
  decided_by_user_id: string | null;
  assigned_reviewer_id: string | null;
  payload_json: Record<string, unknown> | null;
  decision_notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutboundMessage {
  id: string;
  organization_id: string;
  transaction_id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: MessageStatus;
  approval_id: string | null;
  send_after: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  organization_id: string;
  transaction_id: string;
  checklist_item_id: string | null;
  timeline_event_id: string | null;
  reminder_type: ReminderType;
  scheduled_for: string;
  status: ReminderStatus;
  outbound_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  transaction_id: string | null;
  actor_type: ActorType;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Phase 2 database row types
// -----------------------------------------------------------------------------

export interface ExtractedFieldValue {
  id: string;
  document_id: string;
  extraction_id: string;
  field_name: string;
  extracted_value: string;
  corrected_value: string | null;
  corrected_by_user_id: string | null;
  corrected_at: string | null;
  is_locked: boolean;
  confidence_score: number | null;
  source_page: number | null;
  created_at: string;
}

export interface FieldCorrection {
  id: string;
  field_value_id: string;
  previous_value: string;
  new_value: string;
  corrected_by_user_id: string;
  correction_reason: string | null;
  created_at: string;
}

export interface TransactionCompleteness {
  id: string;
  transaction_id: string;
  readiness_state: ReadinessState;
  completeness_score: number;
  missing_documents: Record<string, unknown>[];
  missing_signatures: Record<string, unknown>[];
  missing_dates: Record<string, unknown>[];
  missing_financing: Record<string, unknown>[];
  unresolved_reviews: number;
  blockers: Record<string, unknown>[];
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionException {
  id: string;
  transaction_id: string;
  exception_type: string;
  severity: ExceptionSeverity;
  title: string;
  description: string | null;
  resolution_status: ExceptionResolutionStatus;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecommendation {
  id: string;
  transaction_id: string;
  title: string;
  reason: string;
  confidence: number;
  risk_level: string;
  source_signals: Record<string, unknown>[];
  suggested_owner_id: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: RecommendationStatus;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionAssignment {
  id: string;
  transaction_id: string;
  primary_agent_id: string | null;
  coordinator_owner_id: string | null;
  broker_reviewer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  organization_id: string;
  transaction_id: string;
  parent_comment_id: string | null;
  author_user_id: string;
  body: string;
  is_resolved: boolean;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  entity_type: CommentEntityType;
  entity_id: string;
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  is_read: boolean;
  created_at: string;
}

export interface CommunicationThread {
  id: string;
  organization_id: string;
  transaction_id: string | null;
  provider: CommunicationProvider;
  external_thread_id: string;
  subject: string;
  last_message_at: string;
  participant_emails: string[];
  is_linked: boolean;
  linked_by: LinkedBy | null;
  link_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationMessage {
  id: string;
  thread_id: string;
  external_message_id: string;
  direction: MessageDirection;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  body_text: string;
  body_html: string | null;
  sent_at: string;
  has_attachments: boolean;
  attachment_count: number;
  created_at: string;
}

export interface EmailAccountConnection {
  id: string;
  organization_id: string;
  user_id: string;
  provider: CommunicationProvider;
  email_address: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  sync_status: SyncStatus;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueView {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  queue_type: string;
  filters: Record<string, unknown>;
  sort_order: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRule {
  id: string;
  organization_id: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationTemplate {
  id: string;
  organization_id: string;
  template_type: string;
  transaction_type: string | null;
  name: string;
  description: string | null;
  template_data: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacketIngestion {
  id: string;
  organization_id: string;
  transaction_id: string | null;
  status: PacketIngestionStatus;
  file_count: number;
  classification_results: Record<string, unknown> | null;
  created_by_user_id: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Phase 4: External Collaboration & Closing types
// -----------------------------------------------------------------------------

export type CollaboratorRole = 'lender' | 'title_agent' | 'escrow_officer' | 'attorney' | 'inspector' | 'appraiser' | 'other';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type DocumentRequestStatus = 'sent' | 'viewed' | 'uploaded' | 'expired' | 'cancelled';

export type LenderMilestone =
  | 'pre_approval_received' | 'underwriting_started' | 'appraisal_ordered'
  | 'appraisal_received' | 'conditional_approval' | 'clear_to_close' | 'funding_confirmed';

export type TitleMilestone =
  | 'title_search_started' | 'title_search_completed' | 'title_commitment_issued'
  | 'title_issues_found' | 'title_issues_cleared' | 'escrow_opened'
  | 'earnest_money_received' | 'closing_disclosure_sent' | 'closing_scheduled'
  | 'closing_completed' | 'recording_completed' | 'disbursement_completed';

export type ClosingReadinessState = 'not_ready' | 'at_risk' | 'nearly_ready' | 'ready_for_closing';

export type HealthRating = 'healthy' | 'watch' | 'at_risk' | 'critical' | 'unknown';

export type ScoreTrend = 'improving' | 'stable' | 'declining';

export type ObligationStatus = 'waiting' | 'responded' | 'overdue' | 'escalated' | 'cancelled';

export type ExportFormat = 'json' | 'pdf';

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CollaboratorInvite {
  id: string;
  organization_id: string;
  transaction_id: string;
  invited_by_user_id: string;
  email: string;
  full_name: string;
  role: CollaboratorRole;
  status: InviteStatus;
  access_token: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  linked_user_id: string | null;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequest {
  id: string;
  organization_id: string;
  transaction_id: string;
  requested_by_user_id: string;
  recipient_email: string;
  recipient_name: string;
  document_type: string;
  description: string | null;
  status: DocumentRequestStatus;
  access_token: string;
  expires_at: string;
  viewed_at: string | null;
  uploaded_at: string | null;
  cancelled_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequestUpload {
  id: string;
  document_request_id: string;
  document_id: string;
  uploader_email: string;
  uploader_name: string | null;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

export interface LenderStatusUpdate {
  id: string;
  transaction_id: string;
  organization_id: string;
  submitted_by_user_id: string | null;
  submitted_by_email: string | null;
  milestone: LenderMilestone;
  status: string;
  notes: string | null;
  evidence_document_id: string | null;
  created_at: string;
}

export interface TitleStatusUpdate {
  id: string;
  transaction_id: string;
  organization_id: string;
  submitted_by_user_id: string | null;
  submitted_by_email: string | null;
  milestone: TitleMilestone;
  status: string;
  notes: string | null;
  evidence_document_id: string | null;
  created_at: string;
}

export interface ClosingReadiness {
  id: string;
  transaction_id: string;
  readiness_state: ClosingReadinessState;
  overall_score: number;
  document_score: number;
  financing_score: number;
  title_score: number;
  checklist_score: number;
  approval_score: number;
  unresolved_blockers: Record<string, unknown>[];
  missing_documents: Record<string, unknown>[];
  pending_items: Record<string, unknown>[];
  target_closing_date: string | null;
  days_until_closing: number | null;
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface DealHealthScore {
  id: string;
  transaction_id: string;
  organization_id: string;
  overall_score: number;
  rating: HealthRating;
  completeness_factor: number;
  timeliness_factor: number;
  responsiveness_factor: number;
  compliance_factor: number;
  financing_factor: number;
  risk_factors: Record<string, unknown>[];
  positive_signals: Record<string, unknown>[];
  previous_score: number | null;
  score_trend: ScoreTrend | null;
  computed_at: string;
  created_at: string;
}

export interface ResponseObligation {
  id: string;
  transaction_id: string;
  organization_id: string;
  party_type: string;
  party_email: string | null;
  party_name: string;
  obligation_type: string;
  description: string;
  requested_at: string;
  expected_by: string | null;
  responded_at: string | null;
  status: ObligationStatus;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyDigestPreference {
  id: string;
  user_id: string;
  organization_id: string;
  is_enabled: boolean;
  delivery_hour: number;
  timezone: string;
  include_health_risks: boolean;
  include_deadlines: boolean;
  include_pending_approvals: boolean;
  include_stale_responses: boolean;
  include_closing_soon: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyDigest {
  id: string;
  user_id: string;
  organization_id: string;
  digest_date: string;
  content_json: Record<string, unknown>;
  email_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface AuditExportJob {
  id: string;
  organization_id: string;
  transaction_id: string;
  requested_by_user_id: string;
  status: ExportJobStatus;
  include_sections: string[];
  export_format: ExportFormat;
  result_storage_path: string | null;
  result_metadata: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Phase 5: Brokerage Economics & Compliance types
// -----------------------------------------------------------------------------

export type OfficeMembershipRole = 'agent' | 'team_lead' | 'office_manager' | 'managing_broker';

export type CommissionType = 'percentage' | 'flat';

export type RepresentationSide = 'buyer' | 'seller' | 'dual';

export type CommissionRecipientType = 'agent' | 'co_agent' | 'team_lead' | 'brokerage' | 'referral' | 'other';

export type ComplianceIssueCategory =
  | 'missing_document' | 'missing_approval' | 'risky_communication'
  | 'stage_block' | 'unresolved_exception' | 'missing_economics'
  | 'readiness_inconsistency' | 'policy_violation' | 'other';

export type ComplianceIssueStatus = 'open' | 'under_review' | 'blocked' | 'resolved' | 'overridden';

export type PolicyCategory =
  | 'required_document' | 'required_approval' | 'required_economics'
  | 'stage_gate' | 'compliance_signoff' | 'correction_review';

export type EnforcementMode = 'warn' | 'block' | 'require_override';

export type PolicyOverrideStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Office {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  is_active: boolean;
  managing_broker_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  organization_id: string;
  office_id: string | null;
  name: string;
  team_lead_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeMembership {
  id: string;
  user_id: string;
  office_id: string;
  team_id: string | null;
  role: OfficeMembershipRole;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionEconomics {
  id: string;
  transaction_id: string;
  organization_id: string;
  purchase_price: number | null;
  commission_type: CommissionType;
  commission_rate: number | null;
  commission_amount: number | null;
  gross_commission: number | null;
  representation_side: RepresentationSide;
  brokerage_split_pct: number;
  brokerage_share: number | null;
  agent_share: number | null;
  has_referral: boolean;
  referral_fee_pct: number | null;
  referral_fee_amount: number | null;
  referral_party_name: string | null;
  net_brokerage_revenue: number | null;
  is_projected: boolean;
  is_finalized: boolean;
  finalized_at: string | null;
  finalized_by_user_id: string | null;
  close_probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionSplit {
  id: string;
  economics_id: string;
  recipient_type: CommissionRecipientType;
  recipient_user_id: string | null;
  recipient_name: string;
  split_pct: number | null;
  split_amount: number | null;
  notes: string | null;
  created_at: string;
}

export interface ComplianceIssue {
  id: string;
  organization_id: string;
  transaction_id: string;
  category: ComplianceIssueCategory;
  severity: string;
  title: string;
  description: string | null;
  status: ComplianceIssueStatus;
  assigned_to_user_id: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  policy_rule_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceIssueComment {
  id: string;
  issue_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
}

export interface PolicyRule {
  id: string;
  organization_id: string;
  office_id: string | null;
  name: string;
  description: string | null;
  category: PolicyCategory;
  enforcement_mode: EnforcementMode;
  rule_config: Record<string, unknown>;
  applies_to_transaction_types: string[];
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyOverride {
  id: string;
  policy_rule_id: string;
  transaction_id: string;
  organization_id: string;
  override_reason: string;
  overridden_by_user_id: string;
  approved_by_user_id: string | null;
  status: PolicyOverrideStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloseForecastSnapshot {
  id: string;
  organization_id: string;
  snapshot_date: string;
  forecast_month: string;
  total_projected: number;
  total_weighted: number;
  total_closed: number;
  transaction_count: number;
  at_risk_count: number;
  details: Record<string, unknown>[];
  computed_at: string;
}

// -----------------------------------------------------------------------------
// Analytics types
// -----------------------------------------------------------------------------

export type EventCategory = 'activation' | 'transaction' | 'document' | 'extraction' | 'correction' | 'completeness' | 'queue' | 'approval' | 'communication' | 'recommendation' | 'exception' | 'feedback' | 'configuration' | 'navigation';

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'text' | 'issue_report';

export interface ProductEvent {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  event_name: string;
  event_category: EventCategory;
  properties: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

export interface ActivationMilestone {
  id: string;
  organization_id: string;
  user_id: string | null;
  milestone: string;
  achieved_at: string;
  metadata: Record<string, unknown>;
}

export interface ProductFeedback {
  id: string;
  organization_id: string;
  user_id: string;
  feedback_type: FeedbackType;
  feature_area: string;
  entity_type: string | null;
  entity_id: string | null;
  rating: number | null;
  body: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  organization_id: string;
  metric_date: string;
  metric_name: string;
  metric_value: number;
  dimensions: Record<string, unknown>;
  computed_at: string;
}

// -----------------------------------------------------------------------------
// Phase 6: Platform Completeness types
// -----------------------------------------------------------------------------

export type TransactionStage =
  | 'intake'
  | 'under_contract'
  | 'due_diligence'
  | 'financing'
  | 'appraisal'
  | 'title_and_escrow'
  | 'closing_prep'
  | 'closed'
  | 'fell_through'
  | 'archived';

export type StageTriggerType = 'manual' | 'automatic' | 'policy' | 'system';

export type NotificationCategory =
  | 'approval_assigned'
  | 'mention'
  | 'overdue_item'
  | 'blocked_transaction'
  | 'external_upload'
  | 'compliance_issue'
  | 'processing_failure'
  | 'exception_raised'
  | 'stage_changed'
  | 'document_request_fulfilled'
  | 'policy_override_needed'
  | 'closing_approaching'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type BulkActionType =
  | 'assign_owner'
  | 'assign_reviewer'
  | 'request_review'
  | 'mark_reviewed'
  | 'send_reminder'
  | 'archive'
  | 'change_stage'
  | 'bulk_approve';

export type BulkActionStatus = 'pending' | 'processing' | 'completed' | 'partial_failure' | 'failed';

export interface StageTransition {
  id: string;
  transaction_id: string;
  organization_id: string;
  from_stage: string;
  to_stage: string;
  triggered_by_user_id: string | null;
  trigger_type: StageTriggerType;
  reason: string | null;
  blocked_by_policy_rule_id: string | null;
  override_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  transaction_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  priority: NotificationPriority;
  dedup_key: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  organization_id: string;
  approval_assigned: boolean;
  mention: boolean;
  overdue_item: boolean;
  blocked_transaction: boolean;
  external_upload: boolean;
  compliance_issue: boolean;
  processing_failure: boolean;
  exception_raised: boolean;
  stage_changed: boolean;
  document_request_fulfilled: boolean;
  policy_override_needed: boolean;
  closing_approaching: boolean;
  general: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecentSearch {
  id: string;
  user_id: string;
  organization_id: string;
  query: string;
  result_entity_type: string | null;
  result_entity_id: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Phase 7: Import/Migration/Diagnostics types
// -----------------------------------------------------------------------------

export type ImportType = 'contacts' | 'transactions' | 'properties';

export type ImportJobStatus =
  | 'pending' | 'validating' | 'validated' | 'importing'
  | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';

export type ImportRowStatus =
  | 'pending' | 'valid' | 'invalid' | 'imported' | 'skipped' | 'duplicate' | 'error';

export type DuplicateResolution = 'pending' | 'merged' | 'not_duplicate' | 'ignored';

export type DocumentImportBatchStatus =
  | 'pending' | 'uploading' | 'classifying' | 'processing'
  | 'completed' | 'completed_with_errors' | 'failed';

export type RecomputeJobType =
  | 'reextract_document' | 'recompute_completeness' | 'recompute_health_score'
  | 'recompute_closing_readiness' | 'recompute_forecast' | 'rerun_classification'
  | 'recompute_compliance' | 'rebuild_search_index';

export type RecomputeJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type DiagnosticCheckType =
  | 'processing_backlog' | 'extraction_health' | 'search_index_status'
  | 'notification_delivery' | 'storage_usage' | 'data_integrity';

export type DiagnosticStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ImportJob {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  import_type: ImportType;
  file_name: string;
  file_size: number | null;
  storage_path: string | null;
  field_mapping: Record<string, string>;
  status: ImportJobStatus;
  total_rows: number;
  valid_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  duplicate_rows: number;
  skip_duplicates: boolean;
  update_existing: boolean;
  dry_run: boolean;
  validation_errors: Record<string, unknown>[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportRow {
  id: string;
  import_job_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  mapped_data: Record<string, unknown> | null;
  status: ImportRowStatus;
  error_message: string | null;
  duplicate_of_id: string | null;
  created_entity_type: string | null;
  created_entity_id: string | null;
  created_at: string;
}

export interface DuplicateCandidate {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_a_id: string;
  entity_b_id: string;
  similarity_score: number;
  match_fields: Record<string, unknown>[];
  resolution: DuplicateResolution | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface DocumentImportBatch {
  id: string;
  organization_id: string;
  transaction_id: string | null;
  created_by_user_id: string;
  status: DocumentImportBatchStatus;
  total_files: number;
  uploaded_files: number;
  classified_files: number;
  processed_files: number;
  failed_files: number;
  results: Record<string, unknown>[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecomputeJob {
  id: string;
  organization_id: string;
  initiated_by_user_id: string;
  job_type: RecomputeJobType;
  target_entity_type: string | null;
  target_entity_id: string | null;
  status: RecomputeJobStatus;
  result_summary: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SystemDiagnostic {
  id: string;
  organization_id: string;
  check_type: DiagnosticCheckType;
  status: DiagnosticStatus;
  details: Record<string, unknown>;
  checked_at: string;
}

export interface BulkActionJob {
  id: string;
  organization_id: string;
  initiated_by_user_id: string;
  action_type: BulkActionType;
  target_entity_type: string;
  target_entity_ids: string[];
  action_params: Record<string, unknown>;
  status: BulkActionStatus;
  total_count: number;
  success_count: number;
  failure_count: number;
  results: Record<string, unknown>[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
