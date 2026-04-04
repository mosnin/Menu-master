import { supabase } from '@/lib/db/client';
import { logAction } from '@/lib/audit/logger';
import type { TimelineEvent } from '@/types';

export async function createTimelineEventsFromExtraction(
  transactionId: string,
  extractionData: Record<string, unknown>,
): Promise<TimelineEvent[]> {
  const events: Array<{
    transaction_id: string;
    event_type: string;
    title: string;
    description: string;
    event_date: string | null;
    status: string;
    source: string;
  }> = [];

  if (extractionData.inspection_deadline) {
    events.push({
      transaction_id: transactionId,
      event_type: 'inspection_deadline',
      title: 'Inspection deadline',
      description: 'Deadline for completing the property inspection.',
      event_date: extractionData.inspection_deadline as string,
      status: 'upcoming',
      source: 'ai_generated',
    });
  }

  if (extractionData.financing_contingency_date) {
    events.push({
      transaction_id: transactionId,
      event_type: 'financing_contingency_date',
      title: 'Financing contingency deadline',
      description:
        'Deadline for the buyer to secure financing or waive the contingency.',
      event_date: extractionData.financing_contingency_date as string,
      status: 'upcoming',
      source: 'ai_generated',
    });
  }

  if (extractionData.closing_date) {
    events.push({
      transaction_id: transactionId,
      event_type: 'closing_date',
      title: 'Closing date',
      description: 'Scheduled date for the closing of the transaction.',
      event_date: extractionData.closing_date as string,
      status: 'upcoming',
      source: 'ai_generated',
    });
  }

  if (events.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('timeline_events')
    .insert(events)
    .select('*');

  if (error) {
    throw new Error(`Failed to create timeline events: ${error.message}`);
  }

  // Get transaction for org id
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();

  for (const event of data) {
    await logAction({
      organizationId: transaction?.organization_id,
      transactionId,
      actorType: 'ai',
      action: 'timeline_event.created',
      targetType: 'timeline_event',
      targetId: event.id,
      metadata: { event_type: event.event_type, event_date: event.event_date },
    });
  }

  return data as TimelineEvent[];
}

export async function addMilestoneEvent(
  transactionId: string,
  eventType: string,
  title: string,
  description?: string,
): Promise<TimelineEvent> {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      transaction_id: transactionId,
      event_type: eventType,
      title,
      description: description ?? null,
      event_date: new Date().toISOString(),
      status: 'completed',
      source: 'system',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create milestone event: ${error.message}`);
  }

  // Get transaction for org id
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId,
    actorType: 'system',
    action: 'timeline_event.created',
    targetType: 'timeline_event',
    targetId: data.id,
    metadata: { event_type: eventType },
  });

  return data as TimelineEvent;
}

export async function getTimeline(
  transactionId: string,
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('event_date', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch timeline: ${error.message}`);
  }

  return (data ?? []) as TimelineEvent[];
}
