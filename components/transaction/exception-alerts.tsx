'use client';

import { useState, useEffect, useTransition } from 'react';
import { getExceptionsAction, resolveExceptionAction } from '@/app/actions/exception-actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { TransactionException } from '@/types';

interface ExceptionAlertsProps {
  transactionId: string;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50/80',
    border: 'border-red-200/60',
    borderLeft: 'border-l-red-500',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-100 text-red-800',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50/80',
    border: 'border-amber-200/60',
    borderLeft: 'border-l-amber-500',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-800',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/60',
    borderLeft: 'border-l-blue-500',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100 text-blue-800',
    label: 'Info',
  },
};

export function ExceptionAlerts({ transactionId }: ExceptionAlertsProps) {
  const [exceptions, setExceptions] = useState<TransactionException[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getExceptionsAction(transactionId)
      .then((data) => setExceptions(data ?? []))
      .catch(() => setExceptions([]))
      .finally(() => setLoading(false));
  }, [transactionId]);

  function handleResolve(exceptionId: string) {
    setResolvingId(exceptionId);
    startTransition(async () => {
      try {
        await resolveExceptionAction(exceptionId, 'Resolved from transaction overview');
        setDismissedIds((prev) => new Set([...prev, exceptionId]));
      } catch {
        // Silently handle error
      } finally {
        setResolvingId(null);
      }
    });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  const visibleExceptions = exceptions.filter((e) => !dismissedIds.has(e.id));

  if (visibleExceptions.length === 0) return null;

  // Sort: critical first, then warning, then info
  const sortOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = [...visibleExceptions].sort(
    (a, b) => (sortOrder[a.severity] ?? 3) - (sortOrder[b.severity] ?? 3),
  );

  return (
    <div className="space-y-3">
      {sorted.map((exception) => {
        const config = severityConfig[exception.severity] ?? severityConfig.info;
        const Icon = config.icon;
        const isResolving = resolvingId === exception.id;

        return (
          <Card
            key={exception.id}
            className={cn(
              'rounded-xl border-l-4 shadow-sm transition-all duration-300',
              config.bg,
              config.border,
              config.borderLeft,
              isResolving && 'opacity-50',
            )}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className={cn('mt-0.5 shrink-0', config.iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-sm font-semibold tracking-tight truncate">
                    {exception.title}
                  </p>
                  <Badge className={cn('text-[10px] px-1.5 py-0 font-medium shrink-0', config.badgeBg)}>
                    {config.label}
                  </Badge>
                </div>
                {exception.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {exception.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg px-3 text-xs h-8"
                  onClick={() => handleResolve(exception.id)}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Resolve
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
