import { supabase } from '@/lib/db/client';
import * as transactionRepo from '@/lib/repositories/transactions';
import * as propertyRepo from '@/lib/repositories/properties';
import * as contactRepo from '@/lib/repositories/contacts';
import * as transactionPartyRepo from '@/lib/repositories/transaction-parties';
import * as documentRepo from '@/lib/repositories/documents';
import { logAction } from '@/lib/audit/logger';
import { validateTransactionTransition } from '@/lib/services/status-transitions';
import { generateDefaultChecklist } from './checklist-service';
import type { CreateTransactionInput } from '@/lib/validation/schemas';
import type { Transaction, TransactionStatus } from '@/types';

export async function createTransaction(
  input: CreateTransactionInput,
  userId: string,
): Promise<Transaction> {
  // 1. Create property if address provided
  let propertyId: string | null = null;
  if (input.propertyAddress) {
    const property = await propertyRepo.create({
      organization_id: input.organizationId,
      address_line_1: input.propertyAddress.addressLine1,
      address_line_2: input.propertyAddress.addressLine2 ?? null,
      city: input.propertyAddress.city,
      state: input.propertyAddress.state,
      postal_code: input.propertyAddress.postalCode,
    });
    propertyId = property.id;
  }

  // 2. Create transaction
  const transaction = await transactionRepo.create({
    organization_id: input.organizationId,
    title: input.title,
    status: 'draft' as TransactionStatus,
    stage: 'intake',
    property_id: propertyId,
    created_by_user_id: userId,
    office_id: null,
    team_id: null,
  });

  // 3. Create contacts and transaction parties
  if (input.buyerName) {
    const buyerContact = await contactRepo.create({
      organization_id: input.organizationId,
      full_name: input.buyerName,
      email: input.buyerEmail || null,
      phone: null,
      contact_type: 'buyer',
    });
    await transactionPartyRepo.create({
      transaction_id: transaction.id,
      contact_id: buyerContact.id,
      role: 'buyer',
    });
  }

  if (input.sellerName) {
    const sellerContact = await contactRepo.create({
      organization_id: input.organizationId,
      full_name: input.sellerName,
      email: input.sellerEmail || null,
      phone: null,
      contact_type: 'seller',
    });
    await transactionPartyRepo.create({
      transaction_id: transaction.id,
      contact_id: sellerContact.id,
      role: 'seller',
    });
  }

  // 4. Generate default checklist from template
  await generateDefaultChecklist(transaction.id);

  // 5. Create timeline event for transaction creation
  await supabase.from('timeline_events').insert({
    transaction_id: transaction.id,
    event_type: 'transaction_created',
    title: 'Transaction created',
    description: `Transaction "${input.title}" was created.`,
    event_date: new Date().toISOString(),
    status: 'completed',
    source: 'system',
  });

  // 6. Audit log
  await logAction({
    organizationId: input.organizationId,
    transactionId: transaction.id,
    actorType: 'user',
    actorUserId: userId,
    action: 'transaction.created',
    targetType: 'transaction',
    targetId: transaction.id,
    metadata: { title: input.title },
  });

  return transaction;
}

export async function getTransactionWithDetails(id: string) {
  const transaction = await transactionRepo.findById(id);
  if (!transaction) return null;

  // Fetch property
  let property = null;
  if (transaction.property_id) {
    property = await propertyRepo.findById(transaction.property_id);
  }

  // Fetch parties with contacts
  const parties = await transactionPartyRepo.findByTransactionId(id);

  // Fetch recent documents
  const documents = await documentRepo.findByTransactionId(id);
  const recentDocuments = documents.slice(0, 10);

  // Fetch checklist summary
  const { data: checklistItems } = await supabase
    .from('checklist_items')
    .select('status')
    .eq('transaction_id', id);

  const checklistSummary = {
    total: checklistItems?.length ?? 0,
    pending: checklistItems?.filter((i) => i.status === 'pending').length ?? 0,
    in_progress:
      checklistItems?.filter((i) => i.status === 'in_progress').length ?? 0,
    completed:
      checklistItems?.filter((i) => i.status === 'completed').length ?? 0,
    needs_review:
      checklistItems?.filter((i) => i.status === 'needs_review').length ?? 0,
  };

  return {
    ...transaction,
    property,
    parties,
    recentDocuments,
    checklistSummary,
  };
}

export async function updateTransactionStatus(
  id: string,
  status: string,
  userId: string,
): Promise<Transaction> {
  // Validate transition from current status
  const existing = await transactionRepo.findById(id);
  if (!existing) throw new Error('Transaction not found');

  validateTransactionTransition(existing.status, status as TransactionStatus);

  const transaction = await transactionRepo.update(id, {
    status: status as TransactionStatus,
  });

  // Create timeline event
  await supabase.from('timeline_events').insert({
    transaction_id: id,
    event_type: 'status_changed',
    title: `Status changed to ${status}`,
    description: `Transaction status was updated to "${status}".`,
    event_date: new Date().toISOString(),
    status: 'completed',
    source: 'system',
  });

  // Audit log
  await logAction({
    organizationId: transaction.organization_id,
    transactionId: id,
    actorType: 'user',
    actorUserId: userId,
    action: 'transaction.status_changed',
    targetType: 'transaction',
    targetId: id,
    metadata: { new_status: status },
  });

  return transaction;
}

export async function getTransactionsByOrg(
  orgId: string,
  filters?: { status?: string },
): Promise<Transaction[]> {
  return transactionRepo.findByOrgId(orgId, {
    status: filters?.status as TransactionStatus | undefined,
  });
}
