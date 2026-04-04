import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  // Transaction statuses
  draft: 'bg-slate-400',
  active: 'bg-blue-500',
  under_contract: 'bg-indigo-500',
  pending: 'bg-amber-500',
  closed: 'bg-green-500',
  cancelled: 'bg-red-500',
  on_hold: 'bg-orange-500',
  // Checklist/approval statuses
  completed: 'bg-green-500',
  in_progress: 'bg-blue-500',
  needs_review: 'bg-amber-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  // Health/readiness
  healthy: 'bg-green-500',
  watch: 'bg-amber-500',
  at_risk: 'bg-orange-500',
  critical: 'bg-red-500',
  ready_for_closing: 'bg-green-500',
  nearly_ready: 'bg-blue-500',
  not_ready: 'bg-red-500',
  // Processing
  processing: 'bg-blue-500 animate-pulse',
  queued: 'bg-slate-400',
  failed: 'bg-red-500',
  // Compliance
  open: 'bg-amber-500',
  under_review: 'bg-blue-500',
  blocked: 'bg-red-500',
  resolved: 'bg-green-500',
  overridden: 'bg-slate-400',
  // Severity
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  // Generic
  success: 'bg-green-500',
  error: 'bg-red-500',
};

interface StatusDotProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, className, size = 'sm' }: StatusDotProps) {
  const color = statusColors[status] || 'bg-slate-400';
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        color,
        className,
      )}
      aria-label={`Status: ${status.replace(/_/g, ' ')}`}
    />
  );
}
