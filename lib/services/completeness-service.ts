import { supabase } from '@/lib/db/client';
import * as completenessRepo from '@/lib/repositories/transaction-completeness';
import { logAction } from '@/lib/audit/logger';
import type {
  TransactionCompleteness,
  ReadinessState,
  ChecklistItem,
  Document,
} from '@/types';

// -----------------------------------------------------------------------------
// Transaction Completeness Service
// Calculates how "ready" a transaction is based on fields, documents,
// and checklist progress. Each category is weighted equally at 33.3%.
// -----------------------------------------------------------------------------

const REQUIRED_FIELDS = [
  'property_address',
  'buyer_name',
  'seller_name',
  'purchase_price',
  'closing_date',
  'earnest_money',
  'financing_type',
] as const;

const REQUIRED_DOCUMENT_TYPES = ['purchase_agreement', 'disclosure'] as const;

interface CompletenessBreakdown {
  fields: { present: string[]; missing: string[]; score: number };
  documents: { present: string[]; missing: string[]; score: number };
  checklist: { total: number; active: number; score: number };
  overall_score: number;
  missing_items: string[];
  readiness_state: ReadinessState;
}

function deriveReadinessState(score: number): ReadinessState {
  if (score >= 90) return 'ready';
  if (score >= 70) return 'nearly_ready';
  if (score >= 40) return 'needs_attention';
  return 'not_ready';
}

export async function recalculateCompleteness(
  transactionId: string,
): Promise<TransactionCompleteness> {
  const breakdown = await calculateBreakdown(transactionId);

  // Persist via upsert
  const record = await completenessRepo.upsert({
    transaction_id: transactionId,
    readiness_state: breakdown.readiness_state,
    completeness_score: breakdown.overall_score,
    missing_documents: breakdown.documents.missing.map((name) => ({
      document_type: name,
    })),
    missing_signatures: [],
    missing_dates: breakdown.fields.missing
      .filter((f) => f === 'closing_date')
      .map((f) => ({ field: f })),
    missing_financing: breakdown.fields.missing
      .filter((f) => f === 'financing_type' || f === 'earnest_money')
      .map((f) => ({ field: f })),
    unresolved_reviews: 0,
    blockers: breakdown.missing_items.map((item) => ({ description: item })),
    computed_at: new Date().toISOString(),
  });

  // Look up transaction for org context
  const { data: transaction } = await supabase
    .from('transactions')
    .select('organization_id')
    .eq('id', transactionId)
    .single();

  await logAction({
    organizationId: transaction?.organization_id,
    transactionId,
    actorType: 'system',
    action: 'completeness.recalculated',
    targetType: 'transaction_completeness',
    targetId: record.id,
    metadata: {
      overall_score: breakdown.overall_score,
      readiness_state: breakdown.readiness_state,
      missing_items: breakdown.missing_items,
    },
  });

  return record;
}

export async function getCompleteness(
  transactionId: string,
): Promise<TransactionCompleteness | null> {
  return completenessRepo.findByTransactionId(transactionId);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function calculateBreakdown(
  transactionId: string,
): Promise<CompletenessBreakdown> {
  const [fieldsResult, documentsResult, checklistResult] = await Promise.all([
    checkFields(transactionId),
    checkDocuments(transactionId),
    checkChecklist(transactionId),
  ]);

  const fieldScore = fieldsResult.score;
  const documentScore = documentsResult.score;
  const checklistScore = checklistResult.score;

  // Each category weighted equally at 33.3%
  const overall_score = Math.round(
    (fieldScore * 100) / 3 +
      (documentScore * 100) / 3 +
      (checklistScore * 100) / 3,
  );

  // Compile missing items list
  const missing_items: string[] = [];

  for (const field of fieldsResult.missing) {
    missing_items.push(`Missing required field: ${field}`);
  }
  for (const doc of documentsResult.missing) {
    missing_items.push(`Missing required document: ${doc}`);
  }
  if (checklistResult.active === 0 && checklistResult.total === 0) {
    missing_items.push('No checklist items created');
  }

  const readiness_state = deriveReadinessState(overall_score);

  return {
    fields: fieldsResult,
    documents: documentsResult,
    checklist: checklistResult,
    overall_score,
    missing_items,
    readiness_state,
  };
}

async function checkFields(
  transactionId: string,
): Promise<{ present: string[]; missing: string[]; score: number }> {
  // Gather data from transaction, property, transaction_parties, and extracted fields
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*, properties(*)')
    .eq('id', transactionId)
    .single();

  const { data: parties } = await supabase
    .from('transaction_parties')
    .select('*, contacts(*)')
    .eq('transaction_id', transactionId);

  // Get extracted field values from documents on this transaction
  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .eq('transaction_id', transactionId);

  let extractedFieldNames = new Set<string>();
  if (documents && documents.length > 0) {
    const docIds = documents.map((d: { id: string }) => d.id);
    const { data: fields } = await supabase
      .from('extracted_field_values')
      .select('field_name')
      .in('document_id', docIds);

    if (fields) {
      extractedFieldNames = new Set(
        fields.map((f: { field_name: string }) => f.field_name),
      );
    }
  }

  const present: string[] = [];
  const missing: string[] = [];

  const property = transaction?.properties;
  const partyRoles = new Set(
    (parties ?? []).map(
      (p: { role: string }) => p.role?.toLowerCase(),
    ),
  );

  for (const field of REQUIRED_FIELDS) {
    let found = false;

    switch (field) {
      case 'property_address':
        found =
          !!property?.address_line_1 ||
          extractedFieldNames.has('property_address');
        break;
      case 'buyer_name':
        found =
          partyRoles.has('buyer') || extractedFieldNames.has('buyer_name');
        break;
      case 'seller_name':
        found =
          partyRoles.has('seller') || extractedFieldNames.has('seller_name');
        break;
      case 'purchase_price':
        found = extractedFieldNames.has('purchase_price');
        break;
      case 'closing_date':
        found = extractedFieldNames.has('closing_date');
        break;
      case 'earnest_money':
        found = extractedFieldNames.has('earnest_money');
        break;
      case 'financing_type':
        found = extractedFieldNames.has('financing_type');
        break;
    }

    if (found) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  const score =
    REQUIRED_FIELDS.length > 0 ? present.length / REQUIRED_FIELDS.length : 1;

  return { present, missing, score };
}

async function checkDocuments(
  transactionId: string,
): Promise<{ present: string[]; missing: string[]; score: number }> {
  const { data: documents } = await supabase
    .from('documents')
    .select('document_type')
    .eq('transaction_id', transactionId);

  const docTypes = new Set(
    (documents ?? [])
      .map((d: { document_type: string | null }) => d.document_type)
      .filter(Boolean),
  );

  const present: string[] = [];
  const missing: string[] = [];

  for (const requiredType of REQUIRED_DOCUMENT_TYPES) {
    if (docTypes.has(requiredType)) {
      present.push(requiredType);
    } else {
      missing.push(requiredType);
    }
  }

  const score =
    REQUIRED_DOCUMENT_TYPES.length > 0
      ? present.length / REQUIRED_DOCUMENT_TYPES.length
      : 1;

  return { present, missing, score };
}

async function checkChecklist(
  transactionId: string,
): Promise<{ total: number; active: number; score: number }> {
  const { data: items } = await supabase
    .from('checklist_items')
    .select('status')
    .eq('transaction_id', transactionId);

  const allItems = (items ?? []) as Pick<ChecklistItem, 'status'>[];
  const total = allItems.length;

  // "Active" means not skipped — at least 1 item must not be skipped
  const active = allItems.filter((i) => i.status !== 'skipped').length;

  if (total === 0) {
    // No checklist at all — 0%
    return { total, active, score: 0 };
  }

  // Score: proportion of items that are not skipped (i.e., being worked on)
  const score = active > 0 ? 1 : 0;

  return { total, active, score };
}
