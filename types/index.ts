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
