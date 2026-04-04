'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Check,
  AlertTriangle,
  Target,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import type { OrchestratorCycle, OrchestratorCycleTrigger } from '@/types';

interface ReasoningSummaryProps {
  cycles: OrchestratorCycle[];
}

const triggerLabels: Record<OrchestratorCycleTrigger, string> = {
  scheduled: 'Scheduled',
  document_uploaded: 'Document Upload',
  approval_changed: 'Approval Changed',
  stage_changed: 'Stage Changed',
  communication_received: 'Communication',
  deadline_approaching: 'Deadline',
  manual: 'Manual',
  entity_updated: 'Entity Updated',
  exception_detected: 'Exception',
  obligation_overdue: 'Obligation Overdue',
};

function CycleItem({ cycle }: { cycle: OrchestratorCycle }) {
  const [expanded, setExpanded] = useState(false);

  const plannerOutput = cycle.planner_output;
  const criticEval = cycle.critic_evaluation;
  const triggerLabel = triggerLabels[cycle.trigger_type] ?? cycle.trigger_type;
  const hasSpecialistTraces =
    Array.isArray((plannerOutput as unknown as Record<string, unknown>)?.specialist_traces) &&
    ((plannerOutput as unknown as Record<string, unknown>).specialist_traces as unknown[]).length > 0;

  const proposedCount = plannerOutput?.proposed_actions?.length ?? 0;
  const executedCount = cycle.selected_actions?.length ?? 0;
  const criticApproved = criticEval?.overall_approval ?? null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="px-5 py-4">
        <button
          type="button"
          className="flex items-start justify-between w-full text-left gap-3"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-medium">
                {triggerLabel}
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 text-[10px] font-medium">
                {proposedCount} proposed
              </Badge>
              <Badge className="bg-green-100 text-green-700 text-[10px] font-medium">
                {executedCount} executed
              </Badge>
              {hasSpecialistTraces && (
                <Badge className="bg-cyan-100 text-cyan-700 text-[10px] font-medium flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  Specialist inputs
                </Badge>
              )}
              {criticApproved !== null && (
                <Badge
                  className={cn(
                    'text-[10px] font-medium flex items-center gap-1',
                    criticApproved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {criticApproved ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    <AlertTriangle className="h-2.5 w-2.5" />
                  )}
                  {criticApproved ? 'Approved' : 'Escalated'}
                </Badge>
              )}
            </div>
            {plannerOutput?.reasoning_summary && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {plannerOutput.reasoning_summary}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(cycle.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="shrink-0 mt-0.5">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            <Separator />

            {/* World state assessment */}
            {plannerOutput?.world_state_assessment && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                  World State Assessment
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {plannerOutput.world_state_assessment}
                </p>
              </div>
            )}

            {/* Blockers */}
            {plannerOutput?.blockers_identified &&
              plannerOutput.blockers_identified.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                    Blockers Identified
                  </p>
                  <ul className="space-y-1">
                    {plannerOutput.blockers_identified.map((blocker, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Proposed actions */}
            {plannerOutput?.proposed_actions &&
              plannerOutput.proposed_actions.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                    Proposed Actions
                  </p>
                  <div className="space-y-1.5">
                    {plannerOutput.proposed_actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Target className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {action.tool_name}
                        </span>
                        <Badge
                          className={cn(
                            'text-[9px] font-medium',
                            action.risk_class === 'safe'
                              ? 'bg-green-100 text-green-700'
                              : action.risk_class === 'medium_risk'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700',
                          )}
                        >
                          {action.risk_class}
                        </Badge>
                        <span className="text-muted-foreground truncate">{action.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Critic notes */}
            {criticEval?.reasoning_summary && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                  Critic Assessment
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {criticEval.reasoning_summary}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReasoningSummary({ cycles }: ReasoningSummaryProps) {
  if (cycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Brain className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No reasoning cycles yet</p>
        <p className="text-xs text-muted-foreground">
          Cycles will appear here once the orchestrator runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Recent Cycles
      </p>
      {cycles.map((cycle) => (
        <CycleItem key={cycle.id} cycle={cycle} />
      ))}
    </div>
  );
}
