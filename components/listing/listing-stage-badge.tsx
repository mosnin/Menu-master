import type { ListingStage } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const stageConfig: Record<ListingStage, { label: string; color: string; dot: string }> = {
  intake: { label: 'Intake', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  preparing: { label: 'Preparing', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  ready_for_review: { label: 'Review', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  ready_to_launch: { label: 'Ready', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  live: { label: 'Live', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  paused: { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  under_contract: { label: 'Under Contract', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  closed: { label: 'Closed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  withdrawn: { label: 'Withdrawn', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

export function ListingStageBadge({ stage }: { stage: ListingStage }) {
  const config = stageConfig[stage] ?? stageConfig.intake;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-medium px-2 py-0.5 gap-1.5 border',
        config.color,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </Badge>
  );
}
