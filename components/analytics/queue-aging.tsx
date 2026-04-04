'use client';

import { useEffect, useState } from 'react';
import { getQueueAgingAction } from '@/app/actions/analytics-actions';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface AgingData {
  overdue: { count: number; avgDaysOverdue: number };
  pendingApprovals: { count: number; avgHoursPending: number };
}

function Skeleton() {
  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="rounded-2xl border bg-card p-7">
          <div className="h-3 w-28 rounded bg-muted mb-4" />
          <div className="h-8 w-12 rounded bg-muted mb-2" />
          <div className="h-3 w-40 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function severityColor(days: number): { bg: string; text: string; icon: typeof CheckCircle2 } {
  if (days < 1) return { bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-600 dark:text-green-400', icon: CheckCircle2 };
  if (days <= 3) return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', icon: Clock };
  return { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', icon: AlertTriangle };
}

function approvalSeverityColor(hours: number): { bg: string; text: string; icon: typeof CheckCircle2 } {
  const days = hours / 24;
  return severityColor(days);
}

export function QueueAging() {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await getQueueAgingAction();
      if (res.error) setError(res.error);
      if (res.data) setData(res.data);
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

  if (!data) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm font-semibold tracking-tight">No queue data available</p>
      </div>
    );
  }

  const overdueStyle = severityColor(data.overdue.avgDaysOverdue);
  const OverdueIcon = overdueStyle.icon;
  const approvalStyle = approvalSeverityColor(data.pendingApprovals.avgHoursPending);
  const ApprovalIcon = approvalStyle.icon;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
          Queue Aging
        </p>
        <p className="text-sm text-muted-foreground">
          Color-coded by severity: green (&lt;1 day), amber (1-3 days), red (&gt;3 days)
        </p>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
        {/* Overdue Items */}
        <div className="rounded-2xl border bg-card p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Overdue Items
              </p>
              <p className="text-3xl font-semibold tracking-tight">{data.overdue.count}</p>
              <p className="text-sm text-muted-foreground mt-1">
                overdue checklist items
              </p>
            </div>
            <div className={`rounded-lg ${overdueStyle.bg} p-2.5`}>
              <OverdueIcon className={`h-4 w-4 ${overdueStyle.text}`} />
            </div>
          </div>
          {data.overdue.count > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${data.overdue.avgDaysOverdue < 1 ? 'bg-green-500' : data.overdue.avgDaysOverdue <= 3 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                Avg {data.overdue.avgDaysOverdue.toFixed(1)} days overdue
              </span>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="rounded-2xl border bg-card p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Pending Approvals
              </p>
              <p className="text-3xl font-semibold tracking-tight">{data.pendingApprovals.count}</p>
              <p className="text-sm text-muted-foreground mt-1">
                awaiting decision
              </p>
            </div>
            <div className={`rounded-lg ${approvalStyle.bg} p-2.5`}>
              <ApprovalIcon className={`h-4 w-4 ${approvalStyle.text}`} />
            </div>
          </div>
          {data.pendingApprovals.count > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${data.pendingApprovals.avgHoursPending < 24 ? 'bg-green-500' : data.pendingApprovals.avgHoursPending <= 72 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                Avg {data.pendingApprovals.avgHoursPending < 24
                  ? `${data.pendingApprovals.avgHoursPending.toFixed(1)} hours`
                  : `${(data.pendingApprovals.avgHoursPending / 24).toFixed(1)} days`} pending
              </span>
            </div>
          )}
        </div>
      </div>

      {data.overdue.count === 0 && data.pendingApprovals.count === 0 && (
        <div className="rounded-2xl border bg-card p-7 text-center">
          <div className="rounded-full bg-green-50 dark:bg-green-950/40 p-4 mb-4 inline-flex">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-semibold tracking-tight">Queue is clear</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
            No overdue items or pending approvals at this time.
          </p>
        </div>
      )}
    </div>
  );
}
