'use client';

import type { ListingStage } from '@/types';
import { cn } from '@/lib/utils';

const PIPELINE_STAGES: { stage: ListingStage; label: string; short: string }[] = [
  { stage: 'intake', label: 'Intake', short: 'IN' },
  { stage: 'preparing', label: 'Preparing', short: 'PR' },
  { stage: 'ready_for_review', label: 'Review', short: 'RV' },
  { stage: 'ready_to_launch', label: 'Ready', short: 'RD' },
  { stage: 'live', label: 'Live', short: 'LV' },
  { stage: 'under_contract', label: 'Under Contract', short: 'UC' },
  { stage: 'closed', label: 'Closed', short: 'CL' },
];

export function ListingPipeline({ currentStage }: { currentStage: ListingStage }) {
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.stage === currentStage);
  const isPausedOrTerminal = ['paused', 'withdrawn', 'archived'].includes(currentStage);

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STAGES.map((s, i) => {
        const isCompleted = !isPausedOrTerminal && i < currentIndex;
        const isCurrent = s.stage === currentStage;
        return (
          <div key={s.stage} className="flex items-center gap-1">
            <div
              className={cn(
                'flex items-center justify-center rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all',
                isCompleted && 'bg-primary/10 text-primary',
                isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                !isCompleted && !isCurrent && 'bg-muted/40 text-muted-foreground/50',
              )}
            >
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.short}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div
                className={cn(
                  'h-px w-3 transition-colors',
                  isCompleted ? 'bg-primary/30' : 'bg-border/50',
                )}
              />
            )}
          </div>
        );
      })}
      {isPausedOrTerminal && (
        <div className="ml-2">
          <span className={cn(
            'text-[11px] font-medium px-2 py-1 rounded-md',
            currentStage === 'paused' && 'bg-orange-100 text-orange-700',
            currentStage === 'withdrawn' && 'bg-red-100 text-red-700',
            currentStage === 'archived' && 'bg-gray-100 text-gray-500',
          )}>
            {currentStage === 'paused' ? 'Paused' : currentStage === 'withdrawn' ? 'Withdrawn' : 'Archived'}
          </span>
        </div>
      )}
    </div>
  );
}
