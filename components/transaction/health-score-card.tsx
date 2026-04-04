'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUp, ArrowDown, Minus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HealthScoreCardProps {
  transactionId: string;
  overallScore: number;
  rating: 'healthy' | 'watch' | 'at_risk' | 'critical';
  trend: 'up' | 'flat' | 'down';
  riskFactors?: string[];
}

const ratingConfig: Record<string, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800' },
  watch: { label: 'Watch', className: 'bg-amber-100 text-amber-800' },
  at_risk: { label: 'At Risk', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

const trendConfig = {
  up: { icon: ArrowUp, className: 'text-green-600', label: 'Improving' },
  flat: { icon: Minus, className: 'text-muted-foreground', label: 'Stable' },
  down: { icon: ArrowDown, className: 'text-red-600', label: 'Declining' },
};

export function HealthScoreCard({
  transactionId,
  overallScore,
  rating,
  trend,
  riskFactors = [],
}: HealthScoreCardProps) {
  const ratingStyle = ratingConfig[rating] ?? ratingConfig.watch;
  const trendStyle = trendConfig[trend] ?? trendConfig.flat;
  const TrendIcon = trendStyle.icon;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'text-4xl font-bold tracking-tighter tabular-nums',
              scoreColor(overallScore),
            )}
          >
            {overallScore}
          </span>
          <div className="flex flex-col gap-1.5">
            <Badge className={cn('text-[10px] font-medium w-fit', ratingStyle.className)}>
              {ratingStyle.label}
            </Badge>
            <span className={cn('text-xs flex items-center gap-1', trendStyle.className)}>
              <TrendIcon className="h-3 w-3" />
              {trendStyle.label}
            </span>
          </div>
        </div>

        {riskFactors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {riskFactors.slice(0, 4).map((factor, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2.5 text-xs text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {factor}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/transactions/${transactionId}/closing`}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-4 transition-colors duration-150"
        >
          View Details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
