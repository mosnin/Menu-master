'use client';

import { cn } from '@/lib/utils';
import type { TransactionStage } from '@/types';

const stageColors: Record<TransactionStage, { bg: string; text: string; dot: string }> = {
  intake: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  under_contract: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  due_diligence: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  financing: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  appraisal: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  title_and_escrow: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  closing_prep: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  closed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  fell_through: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const stageLabels: Record<TransactionStage, string> = {
  intake: 'Intake',
  under_contract: 'Under Contract',
  due_diligence: 'Due Diligence',
  financing: 'Financing',
  appraisal: 'Appraisal',
  title_and_escrow: 'Title & Escrow',
  closing_prep: 'Closing Prep',
  closed: 'Closed',
  fell_through: 'Fell Through',
  archived: 'Archived',
};

interface StageBadgeProps {
  stage: TransactionStage;
  size?: 'sm' | 'md';
  className?: string;
}

export function StageBadge({ stage, size = 'sm', className }: StageBadgeProps) {
  const colors = stageColors[stage] ?? stageColors.intake;
  const label = stageLabels[stage] ?? stage;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        colors.bg, colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}
