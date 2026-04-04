'use client';

import { useEffect, useState } from 'react';
import { getCorrectionHotspotsAction } from '@/app/actions/analytics-actions';

interface Hotspot {
  fieldName: string;
  count: number;
}

interface HotspotsData {
  hotspots: Hotspot[];
  totalCorrections: number;
}

function Skeleton() {
  return (
    <div className="rounded-2xl border bg-card p-7 animate-pulse space-y-4">
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-5 rounded bg-muted" style={{ width: `${80 - i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CorrectionHotspots() {
  const [data, setData] = useState<HotspotsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await getCorrectionHotspotsAction();
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

  if (!data || data.hotspots.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-7 text-center">
        <p className="text-sm font-semibold tracking-tight">No corrections recorded yet</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
          When users correct extracted fields, the most frequently corrected fields will appear here.
        </p>
      </div>
    );
  }

  const maxCount = data.hotspots[0]?.count ?? 1;

  return (
    <div className="rounded-2xl border bg-card p-7">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
        Correction Hotspots
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Top 10 most corrected fields ({data.totalCorrections} total corrections)
      </p>

      <div className="space-y-4">
        {data.hotspots.map(({ fieldName, count }) => {
          const pct = (count / maxCount) * 100;
          return (
            <div key={fieldName}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium truncate max-w-[60%]">
                  {fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} correction{count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
