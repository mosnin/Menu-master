'use client';

import { useEffect, useState } from 'react';
import { getOrgMetricsAction } from '@/app/actions/analytics-actions';

interface RecMetrics {
  total: number;
  byStatus: Record<string, number>;
  byActionType: Record<string, { executed: number; dismissed: number; pending: number }>;
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border bg-card p-7">
            <div className="h-3 w-24 rounded bg-muted mb-4" />
            <div className="h-8 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-7">
        <div className="h-3 w-40 rounded bg-muted mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

export function RecommendationPerformance() {
  const [rec, setRec] = useState<RecMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await getOrgMetricsAction();
      if (res.error) setError(res.error);
      if (res.data) setRec(res.data.recommendations);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!rec || rec.total === 0) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm font-semibold tracking-tight">No recommendations yet</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
          When the AI generates recommendations, their execution and dismiss rates will appear here.
        </p>
      </div>
    );
  }

  const executed = rec.byStatus?.executed ?? 0;
  const dismissed = rec.byStatus?.dismissed ?? 0;
  const pending = rec.byStatus?.pending ?? 0;
  const decided = executed + dismissed;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
          Recommendation Performance
        </p>
        <p className="text-sm text-muted-foreground">
          {rec.total} total recommendations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Execution Rate
          </p>
          <p className="text-3xl font-semibold tracking-tight text-green-600 dark:text-green-400">
            {pct(executed, decided)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{executed} executed</p>
        </div>

        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Dismiss Rate
          </p>
          <p className="text-3xl font-semibold tracking-tight text-red-600 dark:text-red-400">
            {pct(dismissed, decided)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{dismissed} dismissed</p>
        </div>

        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Pending
          </p>
          <p className="text-3xl font-semibold tracking-tight text-muted-foreground">
            {pending}
          </p>
          <p className="text-xs text-muted-foreground mt-1">awaiting action</p>
        </div>
      </div>

      {/* By action type */}
      {Object.keys(rec.byActionType).length > 0 && (
        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-5">
            Breakdown by Action Type
          </p>
          <div className="space-y-4">
            {Object.entries(rec.byActionType).map(([actionType, counts]) => {
              const total = counts.executed + counts.dismissed + counts.pending;
              return (
                <div key={actionType}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{total} total</span>
                  </div>
                  {/* Stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {counts.executed > 0 && (
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${(counts.executed / total) * 100}%` }}
                      />
                    )}
                    {counts.dismissed > 0 && (
                      <div
                        className="h-full bg-red-400 transition-all duration-500"
                        style={{ width: `${(counts.dismissed / total) * 100}%` }}
                      />
                    )}
                    {counts.pending > 0 && (
                      <div
                        className="h-full bg-muted-foreground/20 transition-all duration-500"
                        style={{ width: `${(counts.pending / total) * 100}%` }}
                      />
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-[10px] text-green-600 dark:text-green-400">
                      {counts.executed} executed
                    </span>
                    <span className="text-[10px] text-red-600 dark:text-red-400">
                      {counts.dismissed} dismissed
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {counts.pending} pending
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
