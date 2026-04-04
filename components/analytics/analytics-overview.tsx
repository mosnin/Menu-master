'use client';

import { useEffect, useState } from 'react';
import {
  getActivationFunnelAction,
  getOrgMetricsAction,
} from '@/app/actions/analytics-actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FunnelItem {
  milestone: string;
  achieved: boolean;
  achievedAt: string | null;
}

interface OrgMetrics {
  transactions: { total: number; byStatus: Record<string, number> };
  documents: { total: number; byStatus: Record<string, number> };
  approvals: { total: number; pending: number; avgTurnaroundMs: number };
  exceptions: { total: number; bySeverity: Record<string, number> };
  recommendations: {
    total: number;
    byStatus: Record<string, number>;
    byActionType: Record<string, { executed: number; dismissed: number; pending: number }>;
  };
  completeness: { avgScore: number; byState: Record<string, number>; total: number };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-7 animate-pulse">
      <div className="h-3 w-24 rounded bg-muted mb-4" />
      <div className="h-8 w-16 rounded bg-muted mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTurnaround(ms: number): string {
  if (ms === 0) return '--';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-400',
};

const SEVERITY_TEXT_COLORS: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  pending_closing: 'Pending Closing',
  closed: 'Closed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  ocr_required: 'OCR Required',
  manual_review: 'Manual Review',
};

const READINESS_COLORS: Record<string, string> = {
  ready: 'bg-green-500',
  nearly_ready: 'bg-blue-400',
  needs_attention: 'bg-amber-500',
  not_ready: 'bg-red-500',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsOverview() {
  const [funnel, setFunnel] = useState<FunnelItem[] | null>(null);
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [funnelRes, metricsRes] = await Promise.all([
        getActivationFunnelAction(),
        getOrgMetricsAction(),
      ]);
      if (funnelRes.error || metricsRes.error) {
        setError(funnelRes.error || metricsRes.error);
      }
      if (funnelRes.data) setFunnel(funnelRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && !funnel && !metrics) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const achievedCount = funnel ? funnel.filter(m => m.achieved).length : 0;
  const totalMilestones = funnel ? funnel.length : 11;

  const executed = metrics?.recommendations.byStatus?.executed ?? 0;
  const dismissed = metrics?.recommendations.byStatus?.dismissed ?? 0;
  const recTotal = executed + dismissed;

  const feedbackUp = 0; // placeholder — detailed in feedback tab
  const feedbackDown = 0;

  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Activation Funnel */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Activation Funnel
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {achievedCount}
          <span className="text-base font-normal text-muted-foreground"> / {totalMilestones}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">milestones completed</p>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${(achievedCount / totalMilestones) * 100}%` }}
          />
        </div>
      </div>

      {/* Transaction Volume */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Transaction Volume
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.transactions.total ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">total transactions</p>
        <div className="mt-3 space-y-1">
          {Object.entries(metrics?.transactions.byStatus ?? {}).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Document Processing */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Document Processing
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.documents.total ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">total documents</p>
        <div className="mt-3 space-y-1">
          {Object.entries(metrics?.documents.byStatus ?? {}).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Turnaround */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Approval Turnaround
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.approvals.total ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">total approvals</p>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-medium">{metrics?.approvals.pending ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg turnaround</span>
            <span className="font-medium">
              {formatTurnaround(metrics?.approvals.avgTurnaroundMs ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Exception Distribution */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Exception Distribution
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.exceptions.total ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">total exceptions</p>
        <div className="mt-3 space-y-1.5">
          {['critical', 'warning', 'info'].map(severity => {
            const count = metrics?.exceptions.bySeverity?.[severity] ?? 0;
            return (
              <div key={severity} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${SEVERITY_COLORS[severity]}`} />
                  <span className={SEVERITY_TEXT_COLORS[severity]}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </span>
                </span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation Performance */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Recommendations
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.recommendations.total ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">total recommendations</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-600 dark:text-green-400">Execution rate</span>
            <span className="font-medium">{pct(executed, recTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-600 dark:text-red-400">Dismiss rate</span>
            <span className="font-medium">{pct(dismissed, recTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-medium">
              {metrics?.recommendations.byStatus?.pending ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Completeness */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Completeness
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {metrics?.completeness.total
            ? `${Math.round(metrics.completeness.avgScore)}%`
            : '--'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">average score</p>
        <div className="mt-3 space-y-1.5">
          {['ready', 'nearly_ready', 'needs_attention', 'not_ready'].map(state => {
            const count = metrics?.completeness.byState?.[state] ?? 0;
            return (
              <div key={state} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${READINESS_COLORS[state]}`} />
                  <span className="text-muted-foreground">
                    {state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      <div className="rounded-2xl border bg-card p-7">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Feedback
        </p>
        <p className="text-3xl font-semibold tracking-tight">--</p>
        <p className="text-sm text-muted-foreground mt-1">thumbs up / down ratio</p>
        <p className="text-xs text-muted-foreground mt-3">
          See the Feedback tab for full breakdown by feature area.
        </p>
      </div>
    </div>
  );
}
