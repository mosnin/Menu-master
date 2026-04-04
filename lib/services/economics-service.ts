import * as economicsRepo from '@/lib/repositories/transaction-economics';
import * as splitsRepo from '@/lib/repositories/commission-splits';
import { logAction } from '@/lib/audit/logger';
import type {
  TransactionEconomics,
  CommissionSplit,
  CommissionType,
  RepresentationSide,
  CommissionRecipientType,
} from '@/types';

// -----------------------------------------------------------------------------
// Economics Service
// Commission tracking, calculation, and split management.
// -----------------------------------------------------------------------------

interface EconomicsData {
  purchasePrice?: number | null;
  commissionType: CommissionType;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  representationSide: RepresentationSide;
  brokerageSplitPct?: number | null;
  hasReferral?: boolean;
  referralFeePct?: number | null;
  referralPartyName?: string | null;
  closeProbability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
}

function calculateDerivedFields(data: EconomicsData) {
  const brokerageSplitPct = data.brokerageSplitPct ?? 100;

  // Gross commission
  let grossCommission: number | null = null;
  if (data.commissionType === 'percentage' && data.purchasePrice != null && data.commissionRate != null) {
    grossCommission = data.purchasePrice * data.commissionRate / 100;
  } else if (data.commissionType === 'flat' && data.commissionAmount != null) {
    grossCommission = data.commissionAmount;
  }

  // Brokerage and agent shares
  let brokerageShare: number | null = null;
  let agentShare: number | null = null;
  if (grossCommission != null) {
    brokerageShare = grossCommission * brokerageSplitPct / 100;
    agentShare = grossCommission - brokerageShare;
  }

  // Referral fee
  let referralFeeAmount: number | null = null;
  let netBrokerageRevenue: number | null = null;
  if (grossCommission != null && brokerageShare != null) {
    if (data.hasReferral && data.referralFeePct != null) {
      referralFeeAmount = grossCommission * data.referralFeePct / 100;
      netBrokerageRevenue = brokerageShare - referralFeeAmount;
    } else {
      netBrokerageRevenue = brokerageShare;
    }
  }

  return {
    grossCommission,
    brokerageShare,
    agentShare,
    brokerageSplitPct,
    referralFeeAmount,
    netBrokerageRevenue,
  };
}

export async function createOrUpdateEconomics(
  transactionId: string,
  data: Record<string, unknown>,
  userId: string,
): Promise<TransactionEconomics> {
  const parsed: EconomicsData = {
    purchasePrice: data.purchasePrice as number | undefined,
    commissionType: (data.commissionType as CommissionType) ?? 'percentage',
    commissionRate: data.commissionRate as number | undefined,
    commissionAmount: data.commissionAmount as number | undefined,
    representationSide: (data.representationSide as RepresentationSide) ?? 'buyer',
    brokerageSplitPct: data.brokerageSplitPct as number | undefined,
    hasReferral: data.hasReferral as boolean | undefined,
    referralFeePct: data.referralFeePct as number | undefined,
    referralPartyName: data.referralPartyName as string | undefined,
    closeProbability: data.closeProbability as number | undefined,
    expectedCloseDate: data.expectedCloseDate as string | undefined,
    notes: data.notes as string | undefined,
  };

  const orgId = data.orgId as string;
  const derived = calculateDerivedFields(parsed);

  const record = await economicsRepo.upsert({
    transaction_id: transactionId,
    organization_id: orgId,
    purchase_price: parsed.purchasePrice ?? null,
    commission_type: parsed.commissionType,
    commission_rate: parsed.commissionRate ?? null,
    commission_amount: parsed.commissionAmount ?? null,
    gross_commission: derived.grossCommission,
    representation_side: parsed.representationSide,
    brokerage_split_pct: derived.brokerageSplitPct,
    brokerage_share: derived.brokerageShare,
    agent_share: derived.agentShare,
    has_referral: parsed.hasReferral ?? false,
    referral_fee_pct: parsed.referralFeePct ?? null,
    referral_fee_amount: derived.referralFeeAmount,
    referral_party_name: parsed.referralPartyName ?? null,
    net_brokerage_revenue: derived.netBrokerageRevenue,
    is_projected: true,
    is_finalized: false,
    finalized_at: null,
    finalized_by_user_id: null,
    close_probability: parsed.closeProbability ?? null,
    expected_close_date: parsed.expectedCloseDate ?? null,
    notes: parsed.notes ?? null,
  });

  await logAction({
    organizationId: orgId,
    transactionId,
    actorType: 'user',
    actorUserId: userId,
    action: 'economics.updated',
    targetType: 'transaction_economics',
    targetId: record.id,
    metadata: {
      gross_commission: derived.grossCommission,
      net_brokerage_revenue: derived.netBrokerageRevenue,
    },
  });

  return record;
}

export async function finalizeEconomics(
  transactionId: string,
  userId: string,
): Promise<TransactionEconomics> {
  const existing = await economicsRepo.findByTransactionId(transactionId);
  if (!existing) {
    throw new Error(`No economics record found for transaction ${transactionId}`);
  }

  const record = await economicsRepo.update(existing.id, {
    is_finalized: true,
    is_projected: false,
    finalized_at: new Date().toISOString(),
    finalized_by_user_id: userId,
  });

  await logAction({
    organizationId: record.organization_id,
    transactionId,
    actorType: 'user',
    actorUserId: userId,
    action: 'economics.finalized',
    targetType: 'transaction_economics',
    targetId: record.id,
    metadata: {
      gross_commission: record.gross_commission,
      net_brokerage_revenue: record.net_brokerage_revenue,
    },
  });

  return record;
}

export async function getEconomics(
  transactionId: string,
): Promise<{ economics: TransactionEconomics; splits: CommissionSplit[] } | null> {
  const economics = await economicsRepo.findByTransactionId(transactionId);
  if (!economics) return null;

  const splits = await splitsRepo.findByEconomicsId(economics.id);
  return { economics, splits };
}

export async function createSplit(
  economicsId: string,
  data: Record<string, unknown>,
  userId: string,
): Promise<CommissionSplit> {
  const split = await splitsRepo.create({
    economics_id: economicsId,
    recipient_type: (data.recipientType as CommissionRecipientType) ?? 'agent',
    recipient_user_id: (data.recipientUserId as string) ?? null,
    recipient_name: (data.recipientName as string) ?? '',
    split_pct: (data.splitPct as number) ?? null,
    split_amount: (data.splitAmount as number) ?? null,
    notes: (data.notes as string) ?? null,
  });

  await logAction({
    actorType: 'user',
    actorUserId: userId,
    action: 'commission_split.created',
    targetType: 'commission_split',
    targetId: split.id,
    metadata: {
      economics_id: economicsId,
      recipient_type: split.recipient_type,
      recipient_name: split.recipient_name,
    },
  });

  return split;
}

export async function getSplits(economicsId: string): Promise<CommissionSplit[]> {
  return splitsRepo.findByEconomicsId(economicsId);
}

export async function deleteSplits(economicsId: string): Promise<void> {
  return splitsRepo.deleteByEconomicsId(economicsId);
}
