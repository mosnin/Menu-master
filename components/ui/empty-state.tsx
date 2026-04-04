import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      'rounded-xl border border-dashed bg-muted/10',
      className,
    )}>
      <div className={cn('rounded-full bg-muted mb-4', compact ? 'p-3' : 'p-4')}>
        <Icon className={cn('text-muted-foreground', compact ? 'h-5 w-5' : 'h-6 w-6')} />
      </div>
      <p className={cn('font-semibold tracking-tight', compact ? 'text-sm' : 'text-sm')}>{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
