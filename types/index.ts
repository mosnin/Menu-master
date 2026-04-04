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
  property_id: string | null;
  created_by_user_id: string;
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
