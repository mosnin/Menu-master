'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { TransactionStage } from '@/types';

const PIPELINE_STAGES: { key: TransactionStage; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'under_contract', label: 'Contract' },
  { key: 'due_diligence', label: 'Due Diligence' },
  { key: 'financing', label: 'Financing' },
  { key: 'appraisal', label: 'Appraisal' },
  { key: 'title_and_escrow', label: 'Title' },
  { key: 'closing_prep', label: 'Closing' },
  { key: 'closed', label: 'Closed' },
];

interface StagePipelineProps {
  currentStage: TransactionStage;
  className?: string;
}

export function StagePipeline({ currentStage, className }: StagePipelineProps) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  const isFellThrough = currentStage === 'fell_through';
  const isArchived = currentStage === 'archived';

  if (isFellThrough || isArchived) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium',
          isFellThrough ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500',
        )}>
          {isFellThrough ? 'Fell Through' : 'Archived'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {PIPELINE_STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={stage.key} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'h-px w-4 sm:w-6',
                  isCompleted || isCurrent ? 'bg-primary/60' : 'bg-border/60',
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap',
                'transition-colors duration-150',
                isCompleted && 'text-primary/70',
                isCurrent && 'bg-primary/10 text-primary ring-1 ring-primary/20',
                isFuture && 'text-muted-foreground/40',
              )}
              title={stage.label}
            >
              {isCompleted && <Check className="h-3 w-3 text-primary/60" />}
              <span className="hidden md:inline">{stage.label}</span>
              <span className="md:hidden">{stage.label.slice(0, 3)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
