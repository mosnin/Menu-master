import { supabase } from '@/lib/db/client';
import { generateChecklist } from '@/lib/ai/checklist-generator';
import { logAction } from '@/lib/audit/logger';
import { validateChecklistItemTransition } from '@/lib/services/status-transitions';
import type { ChecklistItem, ChecklistItemStatus } from '@/types';

const DEFAULT_BUYER_PURCHASE_ITEMS = [
  {
    title: 'Deposit earnest money',
    description:
      'Deposit the agreed-upon earnest money into the escrow account within the contractual deadline.',
    priority: 'critical',
  },
  {
    title: 'Schedule inspection',
    description:
      'Schedule a professional home inspection with a licensed inspector before the inspection deadline.',
    priority: 'high',
  },
  {
    title: 'Review disclosures',
    description:
      "Review all seller disclosures and property condition reports. Flag any concerns for the buyer's attention.",
    priority: 'high',
  },
  {
    title: 'Secure financing',
    description:
      'Confirm loan approval and ensure all financing contingencies are met before the deadline.',
    priority: 'critical',
  },
  {
    title: 'Appraisal completed',
    description:
      'Ensure the lender-ordered appraisal is completed and the property value meets or exceeds the purchase price.',
    priority: 'high',
  },
  {
    title: 'Final walkthrough',
    description:
      'Schedule and complete a final walkthrough of the property within 24-48 hours of closing.',
    priority: 'medium',
  },
  {
    title: 'Confirm title and escrow',
    description:
      'Verify that the title commitment is clear, title insurance is in place, and escrow instructions are correct.',
    priority: 'high',
  },
  {
    title: 'Closing preparation',
    description:
      'Prepare all closing documents, confirm closing date and location, and ensure all parties are informed.',
    priority: 'medium',
  },
];

export async function generateChecklistFromExtraction(
  transactionId: string,
  extractionData: Record<string, unknown>,
): Promise<ChecklistItem[]> {
  const result = await generateChecklist(extractionData, 'buyer_purchase');

  const items = result.items.map((item) => ({
    transaction_id: transactionId,
    title: item.title,
    description: item.description,
    due_date: item.due_date,
    status: 'pending' as ChecklistItemStatus,
    source: 'ai_generated' as const,
    requires_review: item.requires_review,
    completed_at: null,
  }));

  const { data, error } = await supabase
    .from('checklist_items')
    .insert(items)
    .select('*');

  if (error) {
    throw new Error(`Failed to create checklist items: ${error.message}`);
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
    actorType: 'ai',
    action: 'checklist.generated',
    targetType: 'checklist',
    metadata: { item_count: data.length, source: 'ai_generated' },
  });

  return data as ChecklistItem[];
}

export async function generateDefaultChecklist(
  transactionId: string,
): Promise<ChecklistItem[]> {
  const items = DEFAULT_BUYER_PURCHASE_ITEMS.map((item) => ({
    transaction_id: transactionId,
    title: item.title,
    description: item.description,
    due_date: null,
    status: 'pending' as ChecklistItemStatus,
    source: 'template' as const,
    requires_review: false,
    completed_at: null,
  }));

  const { data, error } = await supabase
    .from('checklist_items')
    .insert(items)
    .select('*');

  if (error) {
    throw new Error(`Failed to create default checklist: ${error.message}`);
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
    action: 'checklist.generated',
    targetType: 'checklist',
    metadata: { item_count: data.length, source: 'template' },
  });

  return data as ChecklistItem[];
}

export async function updateChecklistItem(
  itemId: string,
  updates: {
    status?: ChecklistItemStatus;
    due_date?: string;
    title?: string;
    description?: string;
  },
  userId: string,
): Promise<ChecklistItem> {
  // If status is changing, validate the transition
  if (updates.status) {
    const { data: current } = await supabase
      .from('checklist_items')
      .select('status')
      .eq('id', itemId)
      .single();

    if (!current) throw new Error('Checklist item not found');

    validateChecklistItemTransition(
      current.status as ChecklistItemStatus,
      updates.status,
    );
  }

  const updateData: Record<string, unknown> = { ...updates };

  // If completing, set completed_at
  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update checklist item: ${error.message}`);
  }

  const item = data as ChecklistItem;

  // Get transaction for org id
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', item.transaction_id)
    .single();

  const action =
    updates.status === 'completed'
      ? 'checklist_item.completed'
      : 'checklist_item.updated';

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId: item.transaction_id,
    actorType: 'user',
    actorUserId: userId,
    action: action as 'checklist_item.updated' | 'checklist_item.completed',
    targetType: 'checklist_item',
    targetId: itemId,
    metadata: updates,
  });

  return item;
}

export async function getChecklistSummary(transactionId: string) {
  const { data: items, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch checklist items: ${error.message}`);
  }

  const allItems = (items ?? []) as ChecklistItem[];

  const grouped = {
    pending: allItems.filter((i) => i.status === 'pending'),
    in_progress: allItems.filter((i) => i.status === 'in_progress'),
    completed: allItems.filter((i) => i.status === 'completed'),
    skipped: allItems.filter((i) => i.status === 'skipped'),
    needs_review: allItems.filter((i) => i.status === 'needs_review'),
  };

  return {
    items: allItems,
    grouped,
    counts: {
      total: allItems.length,
      pending: grouped.pending.length,
      in_progress: grouped.in_progress.length,
      completed: grouped.completed.length,
      skipped: grouped.skipped.length,
      needs_review: grouped.needs_review.length,
    },
  };
}

export async function flagMissingItems(
  transactionId: string,
  extractionData: Record<string, unknown>,
): Promise<string[]> {
  const { data: existingItems } = await supabase
    .from('checklist_items')
    .select('title')
    .eq('transaction_id', transactionId);

  const existingTitles = new Set(
    (existingItems ?? []).map((i: { title: string }) =>
      i.title.toLowerCase(),
    ),
  );

  const flagged: string[] = [];

  if (
    extractionData.inspection_deadline &&
    !existingTitles.has('schedule inspection')
  ) {
    flagged.push(
      'Schedule inspection — deadline found in contract but no checklist item exists',
    );
  }

  if (
    extractionData.financing_contingency_date &&
    !existingTitles.has('secure financing')
  ) {
    flagged.push(
      'Secure financing — contingency date found but no checklist item exists',
    );
  }

  if (
    extractionData.closing_date &&
    !existingTitles.has('closing preparation')
  ) {
    flagged.push(
      'Closing preparation — closing date found but no checklist item exists',
    );
  }

  if (
    extractionData.earnest_money &&
    !existingTitles.has('deposit earnest money')
  ) {
    flagged.push(
      'Deposit earnest money — earnest money amount found but no checklist item exists',
    );
  }

  return flagged;
}
