'use client';

import { useState, useEffect, useTransition } from 'react';
import { getRecommendationsAction } from '@/app/actions/recommendation-actions';
import {
  dismissRecommendationAction,
  completeRecommendationAction,
} from '@/app/actions/recommendation-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Lightbulb,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { TransactionRecommendation } from '@/types';

interface RecommendationCardsProps {
  transactionId: string;
}

const riskColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-green-100 text-green-800',
};

function getRiskIcon(level: string) {
  switch (level) {
    case 'high': return ShieldAlert;
    case 'medium': return TrendingUp;
    default: return Lightbulb;
  }
}

export function RecommendationCards({ transactionId }: RecommendationCardsProps) {
  const [recommendations, setRecommendations] = useState<TransactionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRecommendationsAction(transactionId)
      .then((data) => setRecommendations(data ?? []))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, [transactionId]);

  function handleDismiss(id: string) {
    startTransition(async () => {
      try {
        await dismissRecommendationAction(id);
        setHiddenIds((prev) => new Set([...prev, id]));
      } catch {
        // Silently handle
      }
    });
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      try {
        await completeRecommendationAction(id);
        setHiddenIds((prev) => new Set([...prev, id]));
      } catch {
        // Silently handle
      }
    });
  }

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 px-7 pt-7">
          <CardTitle className="flex items-center gap-3 text-base tracking-tight">
            <Sparkles className="h-4.5 w-4.5 text-purple-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-3">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const visible = recommendations.filter((r) => !hiddenIds.has(r.id));

  if (visible.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 px-7 pt-7">
          <CardTitle className="flex items-center gap-3 text-base tracking-tight">
            <Sparkles className="h-4.5 w-4.5 text-purple-600" />
            Recommendations
          </CardTitle>
          <CardDescription className="mt-1.5 leading-relaxed">
            AI-powered next-best-action suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-3">
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed bg-muted/15">
            <Lightbulb className="h-7 w-7 text-muted-foreground/60 mb-4" />
            <p className="text-sm font-semibold tracking-tight">No recommendations</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Recommendations will appear here as the AI analyzes your transaction progress.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 px-7 pt-7">
        <CardTitle className="flex items-center gap-3 text-base tracking-tight">
          <Sparkles className="h-4.5 w-4.5 text-purple-600" />
          Recommendations
        </CardTitle>
        <CardDescription className="mt-1.5 leading-relaxed">
          AI-powered next-best-action suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-3">
        <div className="space-y-4">
          {visible.map((rec, index) => {
            const RiskIcon = getRiskIcon(rec.risk_level);

            return (
              <div
                key={rec.id}
                className={cn(
                  'group rounded-xl border p-5 transition-all duration-200 hover:shadow-sm',
                  index === 0
                    ? 'border-2 border-purple-200/70 bg-gradient-to-r from-purple-50/60 to-purple-50/10'
                    : 'hover:bg-muted/30',
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    index === 0 ? 'bg-purple-100 ring-1 ring-purple-200/40' : 'bg-muted',
                  )}>
                    <RiskIcon className={cn(
                      'h-4 w-4',
                      index === 0 ? 'text-purple-700' : 'text-muted-foreground',
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <p className={cn(
                        'text-sm font-semibold tracking-tight truncate',
                        index === 0 ? 'text-purple-900' : '',
                      )}>
                        {rec.title}
                      </p>
                      {rec.risk_level && (
                        <Badge className={cn(
                          'text-[10px] px-1.5 py-0 font-medium shrink-0',
                          riskColors[rec.risk_level] ?? 'bg-muted text-muted-foreground',
                        )}>
                          {rec.risk_level}
                        </Badge>
                      )}
                      {rec.confidence > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {rec.reason}
                    </p>
                    <div className="flex items-center gap-2 mt-3.5">
                      <Button
                        size="sm"
                        variant={index === 0 ? 'default' : 'outline'}
                        className="rounded-lg px-3 text-xs h-8"
                        onClick={() => handleComplete(rec.id)}
                        disabled={isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg px-3 text-xs h-8 text-muted-foreground"
                        onClick={() => handleDismiss(rec.id)}
                        disabled={isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
