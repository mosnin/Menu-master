'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  FileWarning,
  Ban,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrchestratorMemorySummary, MemorySummaryType } from '@/types';

interface MemorySummariesViewProps {
  summaries: OrchestratorMemorySummary[];
}

// ---------------------------------------------------------------------------
// Type configuration
// ---------------------------------------------------------------------------

const typeConfig: Record<
  MemorySummaryType,
  { bg: string; text: string; icon: React.ElementType; label: string }
> = {
  action_pattern: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: Layers,
    label: 'Action Pattern',
  },
  blocker_pattern: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: AlertCircle,
    label: 'Blocker Pattern',
  },
  recovery_pattern: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: CheckCircle2,
    label: 'Recovery Pattern',
  },
  counterparty_pattern: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: Users,
    label: 'Counterparty Pattern',
  },
  correction_pattern: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: FileWarning,
    label: 'Correction Pattern',
  },
  ignored_action_pattern: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: Ban,
    label: 'Ignored Action',
  },
  successful_resolution: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: CheckCircle2,
    label: 'Successful Resolution',
  },
};

// ---------------------------------------------------------------------------
// Relevance indicator
// ---------------------------------------------------------------------------

function RelevanceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            score > 0.7
              ? 'bg-green-500'
              : score > 0.4
                ? 'bg-amber-500'
                : 'bg-gray-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/70 tabular-nums">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({ summary }: { summary: OrchestratorMemorySummary }) {
  const config = typeConfig[summary.summary_type] ?? typeConfig.action_pattern;
  const TypeIcon = config.icon;

  const hasTimeRange = summary.covers_from && summary.covers_to;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="px-5 py-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                'text-[10px] font-medium flex items-center gap-1',
                config.bg,
                config.text,
              )}
            >
              <TypeIcon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
            <Badge className="bg-gray-100 text-gray-600 text-[9px] font-medium">
              {summary.pattern_count}x
            </Badge>
          </div>
          <RelevanceIndicator score={summary.relevance_score} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {summary.summary}
        </p>

        {hasTimeRange && (
          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(summary.covers_from!), 'MMM d')}
            {' \u2013 '}
            {format(new Date(summary.covers_to!), 'MMM d, yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MemorySummariesView({ summaries }: MemorySummariesViewProps) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Database className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No memory patterns yet</p>
        <p className="text-xs text-muted-foreground">
          Compacted memory summaries will appear here as the orchestrator learns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Memory Patterns
        </p>
        <Badge className="bg-gray-100 text-gray-600 text-[9px] font-medium">
          {summaries.length}
        </Badge>
      </div>

      {summaries.map((summary) => (
        <SummaryCard key={summary.id} summary={summary} />
      ))}
    </div>
  );
}
