'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Users,
  Shield,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Ban,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningContext } from '@/types';

interface LearningInsightsProps {
  learningContext: LearningContext | null;
  orchestratorId: string;
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex items-center justify-between w-full text-left gap-2 py-1"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          {count !== undefined && count > 0 && (
            <Badge className="bg-gray-100 text-gray-600 text-[9px] font-medium">
              {count}
            </Badge>
          )}
        </div>
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Effectiveness bar
// ---------------------------------------------------------------------------

function EffectivenessBar({
  toolName,
  score,
}: {
  toolName: string;
  score: number;
}) {
  const pct = Math.round(score * 100);
  const colorClass =
    score > 0.7
      ? 'bg-green-500'
      : score >= 0.4
        ? 'bg-amber-500'
        : 'bg-red-500';
  const textColorClass =
    score > 0.7
      ? 'text-green-700'
      : score >= 0.4
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-muted-foreground w-32 truncate shrink-0">
        {toolName}
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-[11px] font-medium tabular-nums w-9 text-right', textColorClass)}>
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LearningInsights({
  learningContext,
  orchestratorId: _orchestratorId,
}: LearningInsightsProps) {
  if (!learningContext) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Brain className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No learning data yet</p>
        <p className="text-xs text-muted-foreground">
          Learning signals will appear here once the orchestrator accumulates data.
        </p>
      </div>
    );
  }

  const {
    learningInfluences,
    actionScores,
    ignoredActions,
    counterpartyProfiles,
    correctionPatterns,
  } = learningContext;

  // Sort action scores descending for top 5 / ascending for bottom 5
  const sorted = [...actionScores].sort(
    (a, b) => b.effectiveness_score - a.effectiveness_score,
  );
  const topActions = sorted.slice(0, 5);
  const bottomActions = [...actionScores]
    .sort((a, b) => a.effectiveness_score - b.effectiveness_score)
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Learning Signals
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="px-5 py-4 space-y-4">
          {/* Learning Influences */}
          {learningInfluences.length > 0 && (
            <CollapsibleSection
              title="Learning Influences"
              icon={Lightbulb}
              count={learningInfluences.length}
              defaultOpen
            >
              <ul className="space-y-1.5">
                {learningInfluences.map((influence, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed"
                  >
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-blue-500" />
                    {influence}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {learningInfluences.length > 0 && actionScores.length > 0 && <Separator />}

          {/* Action Effectiveness */}
          {actionScores.length > 0 && (
            <CollapsibleSection
              title="Action Effectiveness"
              icon={BarChart3}
              count={actionScores.length}
              defaultOpen
            >
              <div className="space-y-3">
                {topActions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                        Most Effective
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {topActions.map((action) => (
                        <EffectivenessBar
                          key={action.tool_name}
                          toolName={action.tool_name}
                          score={action.effectiveness_score}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {bottomActions.length > 0 &&
                  bottomActions[0].effectiveness_score < 0.7 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                          Least Effective
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {bottomActions.map((action) => (
                          <EffectivenessBar
                            key={action.tool_name}
                            toolName={action.tool_name}
                            score={action.effectiveness_score}
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CollapsibleSection>
          )}

          {ignoredActions.length > 0 && <Separator />}

          {/* Ignored Actions */}
          {ignoredActions.length > 0 && (
            <CollapsibleSection
              title="Ignored Actions"
              icon={Ban}
              count={ignoredActions.length}
            >
              <div className="space-y-1.5">
                {ignoredActions.map((action) => (
                  <div
                    key={action.tool_name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {action.tool_name}
                    </span>
                    <Badge className="bg-red-100 text-red-700 text-[9px] font-medium">
                      {action.ignore_count}x ignored
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {counterpartyProfiles.length > 0 && <Separator />}

          {/* Counterparty Profiles */}
          {counterpartyProfiles.length > 0 && (
            <CollapsibleSection
              title="Counterparty Profiles"
              icon={Users}
              count={counterpartyProfiles.length}
            >
              <div className="space-y-2">
                {counterpartyProfiles.map((cp) => (
                  <div
                    key={cp.counterparty_type}
                    className="flex items-center gap-2 flex-wrap text-xs"
                  >
                    <Badge variant="outline" className="text-[10px] font-medium capitalize">
                      {cp.counterparty_type}
                    </Badge>
                    {cp.avg_response_hours !== null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {cp.avg_response_hours.toFixed(1)}h avg response
                      </span>
                    )}
                    <Badge
                      className={cn(
                        'text-[9px] font-medium',
                        cp.missed_deadline_rate > 0.3
                          ? 'bg-red-100 text-red-700'
                          : cp.missed_deadline_rate > 0.1
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700',
                      )}
                    >
                      {Math.round(cp.missed_deadline_rate * 100)}% missed deadlines
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {correctionPatterns.length > 0 && <Separator />}

          {/* Active Corrections */}
          {correctionPatterns.length > 0 && (
            <CollapsibleSection
              title="Active Corrections"
              icon={Shield}
              count={correctionPatterns.length}
            >
              <div className="space-y-2">
                {correctionPatterns.map((cp, idx) => (
                  <div key={idx} className="py-1.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700 text-[9px] font-medium capitalize">
                        {cp.category}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-600 text-[9px] font-medium">
                        {cp.occurrence_count}x
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cp.detail}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
