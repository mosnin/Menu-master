'use client';

import { useEffect, useState } from 'react';
import { getActivationFunnelAction } from '@/app/actions/analytics-actions';
import { CheckCircle2, Circle } from 'lucide-react';

interface FunnelItem {
  milestone: string;
  achieved: boolean;
  achievedAt: string | null;
}

function Skeleton() {
  return (
    <div className="rounded-2xl border bg-card p-7 animate-pulse space-y-3">
      <div className="h-3 w-32 rounded bg-muted mb-4" />
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-muted" />
          <div className="h-3 rounded bg-muted" style={{ width: `${40 + Math.random() * 30}%` }} />
        </div>
      ))}
    </div>
  );
}

function formatMilestone(key: string): string {
  return key
    .replace(/^first_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ActivationFunnel() {
  const [funnel, setFunnel] = useState<FunnelItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await getActivationFunnelAction();
      if (res.error) setError(res.error);
      if (res.data) setFunnel(res.data);
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

  if (!funnel) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm font-semibold tracking-tight">No activation data available</p>
      </div>
    );
  }

  const achieved = funnel.filter(m => m.achieved).length;

  return (
    <div className="rounded-2xl border bg-card p-7">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
        Activation Funnel
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        {achieved} of {funnel.length} milestones achieved
      </p>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-8">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${(achieved / funnel.length) * 100}%` }}
        />
      </div>

      {/* Milestone rows */}
      <div className="space-y-0">
        {funnel.map((item, idx) => (
          <div
            key={item.milestone}
            className={`flex items-center gap-4 py-3 ${idx < funnel.length - 1 ? 'border-b border-border/50' : ''}`}
          >
            {/* Icon */}
            {item.achieved ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
            )}

            {/* Label */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm font-medium ${item.achieved ? 'text-foreground' : 'text-muted-foreground/60'}`}
              >
                {formatMilestone(item.milestone)}
              </span>
            </div>

            {/* Date */}
            {item.achievedAt && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatDate(item.achievedAt)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
