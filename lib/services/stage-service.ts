import * as transactionRepo from '@/lib/repositories/transactions';
import * as stageTransitionRepo from '@/lib/repositories/stage-transitions';
import { logAction } from '@/lib/audit/logger';
import type { TransactionStage, StageTransition, StageTriggerType } from '@/types';

// Canonical stage order and allowed transitions
const STAGE_ORDER: TransactionStage[] = [
  'intake',
  'under_contract',
  'due_diligence',
  'financing',
  'appraisal',
  'title_and_escrow',
  'closing_prep',
  'closed',
];

const TERMINAL_STAGES: TransactionStage[] = ['closed', 'fell_through', 'archived'];

// Allowed transitions: forward in pipeline, or to terminal states from any active stage
const STAGE_TRANSITIONS: Record<TransactionStage, TransactionStage[]> = {
  intake: ['under_contract', 'fell_through', 'archived'],
  under_contract: ['due_diligence', 'fell_through', 'archived'],
  due_diligence: ['financing', 'fell_through', 'archived'],
  financing: ['appraisal', 'fell_through', 'archived'],
  appraisal: ['title_and_escrow', 'fell_through', 'archived'],
  title_and_escrow: ['closing_prep', 'fell_through', 'archived'],
  closing_prep: ['closed', 'fell_through', 'archived'],
  closed: ['archived'],
  fell_through: ['archived', 'intake'], // can reactivate
  archived: [],
};

export class InvalidStageTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition from "${from}" to "${to}"`);
    this.name = 'InvalidStageTransitionError';
  }
}

export function getAvailableStageTransitions(currentStage: TransactionStage): TransactionStage[] {
  return STAGE_TRANSITIONS[currentStage] ?? [];
}

export function validateStageTransition(from: TransactionStage, to: TransactionStage): void {
  const allowed = STAGE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidStageTransitionError(from, to);
  }
}

export function isTerminalStage(stage: TransactionStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function getStageOrder(): TransactionStage[] {
  return [...STAGE_ORDER];
}

export function getStageIndex(stage: TransactionStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) {
    // Terminal non-pipeline stages
    if (stage === 'fell_through') return -1;
    if (stage === 'archived') return -2;
  }
  return idx;
}

export function getStageProgress(stage: TransactionStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) return 0;
  return Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
}

export async function transitionStage(
  transactionId: string,
  toStage: TransactionStage,
  userId: string,
  options?: {
    triggerType?: StageTriggerType;
    reason?: string;
    blockedByPolicyRuleId?: string;
    overrideId?: string;
  },
): Promise<StageTransition> {
  const transaction = await transactionRepo.findById(transactionId);
  if (!transaction) throw new Error('Transaction not found');

  const fromStage = (transaction.stage ?? 'intake') as TransactionStage;
  validateStageTransition(fromStage, toStage);

  // Update transaction stage
  await transactionRepo.update(transactionId, { stage: toStage } as any);

  // Record the transition
  const transition = await stageTransitionRepo.create({
    transaction_id: transactionId,
    organization_id: transaction.organization_id,
    from_stage: fromStage,
    to_stage: toStage,
    triggered_by_user_id: userId,
    trigger_type: options?.triggerType ?? 'manual',
    reason: options?.reason ?? null,
    blocked_by_policy_rule_id: options?.blockedByPolicyRuleId ?? null,
    override_id: options?.overrideId ?? null,
    metadata: {},
  });

  // Audit log
  await logAction({
    organizationId: transaction.organization_id,
    transactionId,
    actorType: 'user',
    actorUserId: userId,
    action: 'stage.changed',
    targetType: 'transaction',
    targetId: transactionId,
    metadata: { from_stage: fromStage, to_stage: toStage, reason: options?.reason },
  });

  return transition;
}

export async function getTransitionHistory(
  transactionId: string,
): Promise<StageTransition[]> {
  return stageTransitionRepo.findByTransactionId(transactionId);
}

// Re-export for convenience
export { STAGE_TRANSITIONS, STAGE_ORDER, TERMINAL_STAGES };
