'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  OctagonAlert,
  Shield,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSpecialistTracesAction } from '@/app/actions/orchestrator-actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpecialistRole =
  | 'exception'
  | 'communications'
  | 'compliance'
  | 'closing'
  | 'listing'
  | 'handoff';

type FindingSeverity = 'info' | 'warning' | 'critical';

interface SpecialistFinding {
  severity: FindingSeverity;
  confidence: number;
  summary: string;
  recommended_actions?: string[];
  blocked_reasons?: string[];
}

interface SpecialistTrace {
  id: string;
  specialist_role: SpecialistRole;
  operator_summary: string;
  findings: SpecialistFinding[];
  recommendations: { tool_name: string; reason: string; urgency: string }[];
  contributed_to_plan: boolean;
  created_at: string;
}

interface SpecialistInsightsProps {
  orchestratorId: string;
}

// ---------------------------------------------------------------------------
// Role color mapping
// ---------------------------------------------------------------------------

const roleColors: Record<SpecialistRole, { bg: string; text: string; ring: string }> = {
  exception: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' },
  communications: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  compliance: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200' },
  closing: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200' },
  listing: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  handoff: { bg: 'bg-cyan-100', text: 'text-cyan-700', ring: 'ring-cyan-200' },
};

const severityConfig: Record<
  FindingSeverity,
  { bg: string; text: string; icon: React.ElementType }
> = {
  info: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Info },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: OctagonAlert },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FindingItem({ finding }: { finding: SpecialistFinding }) {
  const config = severityConfig[finding.severity] ?? severityConfig.info;
  const SeverityIcon = config.icon;

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge className={cn('text-[9px] font-medium flex items-center gap-0.5', config.bg, config.text)}>
          <SeverityIcon className="h-2.5 w-2.5" />
          {finding.severity}
        </Badge>
        <span className="text-xs text-muted-foreground leading-relaxed">
          {finding.summary}
        </span>
      </div>

      {finding.recommended_actions && finding.recommended_actions.length > 0 && (
        <div className="pl-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mb-0.5">
            Recommended Actions
          </p>
          <ul className="space-y-0.5">
            {finding.recommended_actions.map((action, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {finding.blocked_reasons && finding.blocked_reasons.length > 0 && (
        <div className="pl-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-red-500/70 mb-0.5">
            Blocked
          </p>
          <ul className="space-y-0.5">
            {finding.blocked_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-[11px] text-red-600">
                <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpecialistCard({ trace }: { trace: SpecialistTrace }) {
  const [expanded, setExpanded] = useState(false);
  const colors = roleColors[trace.specialist_role] ?? roleColors.exception;
  const findingCount = trace.findings.length;
  const criticalCount = trace.findings.filter((f) => f.severity === 'critical').length;
  const warningCount = trace.findings.filter((f) => f.severity === 'warning').length;
  const recommendationCount = trace.recommendations.length;

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
              <Badge className={cn('text-[10px] font-medium capitalize', colors.bg, colors.text)}>
                {trace.specialist_role}
              </Badge>
              <Badge className="bg-gray-100 text-gray-600 text-[10px] font-medium">
                {findingCount} finding{findingCount !== 1 ? 's' : ''}
              </Badge>
              {criticalCount > 0 && (
                <Badge className="bg-red-100 text-red-700 text-[10px] font-medium flex items-center gap-0.5">
                  <OctagonAlert className="h-2.5 w-2.5" />
                  {criticalCount} critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-[10px] font-medium flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {warningCount} warning
                </Badge>
              )}
              {recommendationCount > 0 && (
                <Badge className="bg-blue-100 text-blue-700 text-[10px] font-medium">
                  {recommendationCount} rec{recommendationCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {trace.contributed_to_plan && (
                <Badge className="bg-green-100 text-green-700 text-[10px] font-medium flex items-center gap-0.5">
                  <Shield className="h-2.5 w-2.5" />
                  Contributed to plan
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {trace.operator_summary}
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

            {trace.findings.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                  Findings
                </p>
                <div className="divide-y">
                  {trace.findings.map((finding, idx) => (
                    <FindingItem key={idx} finding={finding} />
                  ))}
                </div>
              </div>
            )}

            {trace.recommendations.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                  Recommendations
                </p>
                <div className="space-y-1.5">
                  {trace.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {rec.tool_name}
                      </span>
                      <Badge
                        className={cn(
                          'text-[9px] font-medium',
                          rec.urgency === 'high'
                            ? 'bg-red-100 text-red-700'
                            : rec.urgency === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {rec.urgency}
                      </Badge>
                      <span className="text-muted-foreground truncate">{rec.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SpecialistInsights({ orchestratorId }: SpecialistInsightsProps) {
  const [traces, setTraces] = useState<SpecialistTrace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await getSpecialistTracesAction(orchestratorId, 3);
      if (result.data) {
        setTraces(result.data as SpecialistTrace[]);
      }
    } catch {
      // silently fail — parent handles errors
    } finally {
      setLoading(false);
    }
  }, [orchestratorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No specialist insights yet</p>
        <p className="text-xs text-muted-foreground">
          Specialist contributions will appear here when specialists are invoked.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Specialist Contributions
      </p>
      {traces.map((trace) => (
        <SpecialistCard key={trace.id} trace={trace} />
      ))}
    </div>
  );
}
