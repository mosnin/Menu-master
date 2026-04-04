'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
  compact,
}: ErrorStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      'rounded-xl border border-destructive/20 bg-destructive/5',
      className,
    )}>
      <div className={cn('rounded-full bg-destructive/10 mb-4', compact ? 'p-3' : 'p-4')}>
        <AlertTriangle className={cn('text-destructive', compact ? 'h-5 w-5' : 'h-6 w-6')} />
      </div>
      <p className="font-semibold tracking-tight text-sm">{title}</p>
      {message && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">{message}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
