'use client';

import { useEffect, useState } from 'react';
import { getListingReadinessAction } from '@/app/actions/listing-actions';
import { cn } from '@/lib/utils';

interface ReadinessResult {
  score: number;
  state: string;
  totalChecklist: number;
  completedChecklist: number;
  requiredChecklist: number;
  completedRequired: number;
  blockedItems: number;
  openExceptions: number;
  criticalExceptions: number;
  pendingSellerDocs: number;
  blockers: string[];
}

const stateColors: Record<string, string> = {
  ready: 'text-green-700 bg-green-50 border-green-200',
  nearly_ready: 'text-blue-700 bg-blue-50 border-blue-200',
  needs_attention: 'text-amber-700 bg-amber-50 border-amber-200',
  not_ready: 'text-red-700 bg-red-50 border-red-200',
};

const stateLabels: Record<string, string> = {
  ready: 'Ready for Launch',
  nearly_ready: 'Nearly Ready',
  needs_attention: 'Needs Attention',
  not_ready: 'Not Ready',
};

export function ListingReadinessCard({ listingId }: { listingId: string }) {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);

  useEffect(() => {
    getListingReadinessAction(listingId).then(r => {
      if (r) setReadiness(r);
    });
  }, [listingId]);

  if (!readiness) {
    return (
      <div className="rounded-2xl border bg-card p-7 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-7">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Launch Readiness
        </span>
        <span className={cn(
          'text-[11px] font-medium px-2.5 py-1 rounded-full border',
          stateColors[readiness.state] ?? stateColors.not_ready,
        )}>
          {stateLabels[readiness.state] ?? readiness.state}
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-5">
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-semibold tracking-tight">{readiness.score}</span>
          <span className="text-sm text-muted-foreground/60 mb-1">/ 100</span>
        </div>
        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              readiness.score >= 90 ? 'bg-green-500' :
              readiness.score >= 70 ? 'bg-blue-500' :
              readiness.score >= 40 ? 'bg-amber-500' : 'bg-red-500',
            )}
            style={{ width: `${readiness.score}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[11px] text-muted-foreground/60 mb-1">Checklist</div>
          <div className="text-sm font-medium">{readiness.completedRequired}/{readiness.requiredChecklist} required</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[11px] text-muted-foreground/60 mb-1">Seller Docs</div>
          <div className="text-sm font-medium">{readiness.pendingSellerDocs} pending</div>
        </div>
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Launch Blockers
          </div>
          <div className="space-y-1.5">
            {readiness.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-muted-foreground">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
