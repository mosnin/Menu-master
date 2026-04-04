'use client';

import { useEffect, useState } from 'react';
import {
  getFeedbackSummaryAction,
  getRecentFeedbackAction,
} from '@/app/actions/analytics-actions';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackSummary = Record<string, { thumbs_up: number; thumbs_down: number; total: number }>;

interface FeedbackItem {
  id: string;
  feedback_type: string;
  feature_area: string;
  body: string | null;
  rating: number | null;
  user_id: string;
  created_at: string;
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="rounded-2xl border bg-card p-7">
        <div className="h-3 w-32 rounded bg-muted mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-7">
        <div className="h-3 w-32 rounded bg-muted mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function feedbackIcon(type: string) {
  if (type === 'thumbs_up') return <ThumbsUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
  if (type === 'thumbs_down') return <ThumbsDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
  return <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
}

function feedbackLabel(type: string): string {
  if (type === 'thumbs_up') return 'Positive';
  if (type === 'thumbs_down') return 'Negative';
  if (type === 'issue_report') return 'Issue';
  return 'Text';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackView() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [recent, setRecent] = useState<FeedbackItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [summaryRes, recentRes] = await Promise.all([
        getFeedbackSummaryAction(),
        getRecentFeedbackAction(),
      ]);
      if (summaryRes.error || recentRes.error) {
        setError(summaryRes.error || recentRes.error);
      }
      if (summaryRes.data) setSummary(summaryRes.data as FeedbackSummary);
      if (recentRes.data) setRecent(recentRes.data as FeedbackItem[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Skeleton />;

  if (error && !summary && !recent) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const summaryEntries = Object.entries(summary ?? {});
  const hasData = summaryEntries.length > 0 || (recent && recent.length > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm font-semibold tracking-tight">No feedback yet</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
          When users submit feedback on AI features, summaries and individual entries will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary by feature area */}
      {summaryEntries.length > 0 && (
        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-5">
            Feedback by Feature Area
          </p>
          <div className="space-y-0">
            {summaryEntries.map(([area, counts], idx) => (
              <div
                key={area}
                className={`flex items-center justify-between py-3 ${idx < summaryEntries.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <span className="text-sm font-medium">
                  {area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <ThumbsUp className="h-3 w-3" />
                    {counts.thumbs_up}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <ThumbsDown className="h-3 w-3" />
                    {counts.thumbs_down}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {counts.total} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent feedback */}
      {recent && recent.length > 0 && (
        <div className="rounded-2xl border bg-card p-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-5">
            Recent Feedback
          </p>
          <div className="space-y-0">
            {recent.map((item, idx) => (
              <div
                key={item.id}
                className={`py-3 ${idx < recent.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {feedbackIcon(item.feedback_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                        {feedbackLabel(item.feedback_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.feature_area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-xs text-muted-foreground/60 tabular-nums ml-auto shrink-0">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    {item.body && (
                      <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">
                        {item.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      User: {item.user_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
