import { getCompletenessAction } from '@/app/actions/completeness-actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompletenessBadgeProps {
  transactionId: string;
}

function getScoreColor(score: number) {
  if (score < 40) return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-200/60', bar: 'bg-red-500' };
  if (score < 70) return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-200/60', bar: 'bg-yellow-500' };
  if (score < 90) return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-200/60', bar: 'bg-green-500' };
  return { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-200/60', bar: 'bg-blue-500' };
}

function getReadinessLabel(state: string) {
  switch (state) {
    case 'ready': return 'Ready';
    case 'nearly_ready': return 'Nearly Ready';
    case 'needs_attention': return 'Needs Attention';
    case 'not_ready': return 'Not Ready';
    default: return 'Unknown';
  }
}

export async function CompletenessBadge({ transactionId }: CompletenessBadgeProps) {
  let completeness;
  try {
    completeness = await getCompletenessAction(transactionId);
  } catch {
    return null;
  }

  if (!completeness) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-4 py-2.5 ring-1 ring-border/50">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="text-sm font-medium text-muted-foreground">No score yet</span>
        </div>
      </div>
    );
  }

  const score = completeness.completeness_score;
  const colors = getScoreColor(score);

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-2.5 ring-1',
        colors.bg,
        colors.ring,
      )}>
        {/* Circular score indicator */}
        <div className="relative flex h-9 w-9 items-center justify-center">
          <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-black/5"
            />
            <circle
              cx="18" cy="18" r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${score * 0.88} 88`}
              strokeLinecap="round"
              className={colors.text}
            />
          </svg>
          <span className={cn('absolute text-[10px] font-bold tabular-nums', colors.text)}>
            {score}
          </span>
        </div>
        <div className="flex flex-col">
          <span className={cn('text-sm font-semibold tracking-tight', colors.text)}>
            {score}% Complete
          </span>
          <span className={cn('text-xs', colors.text, 'opacity-70')}>
            {getReadinessLabel(completeness.readiness_state)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="hidden sm:flex flex-1 max-w-48 flex-col gap-1.5">
        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
            style={{ width: `${score}%` }}
          />
        </div>
        {completeness.unresolved_reviews > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {completeness.unresolved_reviews} unresolved {completeness.unresolved_reviews === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>
    </div>
  );
}
