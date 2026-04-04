import { supabase } from '@/lib/db/client';
import { logger } from '@/lib/logger';

// Event taxonomy — all valid event names grouped by category
export const EVENT_TAXONOMY = {
  // Activation funnel
  activation: [
    'organization_setup_started',
    'organization_setup_completed',
    'first_login',
    'pilot_readiness_viewed',
    'getting_started_viewed',
    'getting_started_step_completed',
  ],
  // Transaction lifecycle
  transaction: [
    'transaction_created',
    'transaction_status_changed',
    'transaction_viewed',
    'transaction_list_viewed',
  ],
  // Document flow
  document: [
    'document_uploaded',
    'document_extraction_completed',
    'document_extraction_failed',
    'document_viewed',
  ],
  // Extraction review
  extraction: [
    'extraction_reviewed',
    'extraction_field_viewed',
  ],
  // Corrections
  correction: [
    'extraction_field_corrected',
    'correction_locked',
  ],
  // Completeness
  completeness: [
    'completeness_recomputed',
    'completeness_viewed',
  ],
  // Queue
  queue: [
    'queue_viewed',
    'queue_item_opened',
    'queue_filtered',
  ],
  // Approvals
  approval: [
    'approval_requested',
    'approval_approved',
    'approval_rejected',
    'approval_viewed',
  ],
  // Communication
  communication: [
    'outbound_message_sent',
    'email_account_connected',
    'email_thread_linked',
    'communication_reply_ingested',
  ],
  // Recommendations
  recommendation: [
    'recommendation_shown',
    'recommendation_executed',
    'recommendation_dismissed',
    'recommendation_feedback_given',
  ],
  // Exceptions
  exception: [
    'exception_created',
    'exception_resolved',
    'exception_feedback_given',
  ],
  // Feedback
  feedback: [
    'feedback_submitted',
    'issue_reported',
  ],
  // Configuration
  configuration: [
    'rule_created',
    'rule_toggled',
    'template_created',
    'template_applied',
  ],
  // Navigation
  navigation: [
    'dashboard_viewed',
    'settings_viewed',
  ],
} as const;

// Derive the full event name union type from the taxonomy
type EventTaxonomy = typeof EVENT_TAXONOMY;
export type AnalyticsEventCategory = keyof EventTaxonomy;
export type AnalyticsEventName = EventTaxonomy[AnalyticsEventCategory][number];

interface TrackEventParams {
  orgId?: string;
  userId?: string;
  event: AnalyticsEventName;
  category: AnalyticsEventCategory;
  properties?: Record<string, unknown>;
  sessionId?: string;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const { error } = await supabase.from('product_events').insert({
      organization_id: params.orgId ?? null,
      user_id: params.userId ?? null,
      event_name: params.event,
      event_category: params.category,
      properties: params.properties ?? {},
      session_id: params.sessionId ?? null,
    });
    if (error) {
      logger.error('Failed to track event', { error, event: params.event });
    }
  } catch (err) {
    // Analytics should never break the app
    logger.error('Analytics tracking error', { error: err, event: params.event });
  }
}

// Batch track — for cases where multiple events happen together
export async function trackEvents(events: TrackEventParams[]): Promise<void> {
  try {
    const rows = events.map(e => ({
      organization_id: e.orgId ?? null,
      user_id: e.userId ?? null,
      event_name: e.event,
      event_category: e.category,
      properties: e.properties ?? {},
      session_id: e.sessionId ?? null,
    }));
    const { error } = await supabase.from('product_events').insert(rows);
    if (error) {
      logger.error('Failed to batch track events', { error });
    }
  } catch (err) {
    logger.error('Analytics batch tracking error', { error: err });
  }
}
