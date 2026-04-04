'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Clock,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrchestratorOrgProfile } from '@/types';

interface OrgAdaptationProfileProps {
  profile: OrchestratorOrgProfile | null;
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
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
// Preference badge helpers
// ---------------------------------------------------------------------------

const escalationColors: Record<string, { bg: string; text: string }> = {
  fast: { bg: 'bg-red-100', text: 'text-red-700' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  slow: { bg: 'bg-green-100', text: 'text-green-700' },
};

const sensitivityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

const urgencyColors: Record<string, { bg: string; text: string }> = {
  conservative: { bg: 'bg-green-100', text: 'text-green-700' },
  neutral: { bg: 'bg-blue-100', text: 'text-blue-700' },
  aggressive: { bg: 'bg-red-100', text: 'text-red-700' },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OrgAdaptationProfile({ profile }: OrgAdaptationProfileProps) {
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-muted p-3 mb-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No organization profile yet</p>
        <p className="text-xs text-muted-foreground">
          The adaptation profile will build as the orchestrator learns your preferences.
        </p>
      </div>
    );
  }

  const escColor = escalationColors[profile.preferred_escalation_timing] ?? escalationColors.normal;
  const compColor = sensitivityColors[profile.compliance_sensitivity] ?? sensitivityColors.normal;
  const urgColor = urgencyColors[profile.urgency_bias] ?? urgencyColors.neutral;
  const routeColor = sensitivityColors[profile.specialist_routing_sensitivity] ?? sensitivityColors.normal;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Organization Profile
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="px-5 py-4 space-y-4">
          {/* Preferences Grid */}
          <CollapsibleSection title="Preferences" icon={Settings} defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Escalation Timing
                </p>
                <Badge className={cn('text-[10px] font-medium capitalize', escColor.bg, escColor.text)}>
                  {profile.preferred_escalation_timing}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Compliance Sensitivity
                </p>
                <Badge className={cn('text-[10px] font-medium capitalize', compColor.bg, compColor.text)}>
                  {profile.compliance_sensitivity}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Urgency Bias
                </p>
                <Badge className={cn('text-[10px] font-medium capitalize', urgColor.bg, urgColor.text)}>
                  {profile.urgency_bias}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Manual Review
                </p>
                <Badge
                  className={cn(
                    'text-[10px] font-medium',
                    profile.strict_manual_review
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700',
                  )}
                >
                  {profile.strict_manual_review ? 'Strict' : 'Standard'}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Specialist Routing
                </p>
                <Badge className={cn('text-[10px] font-medium capitalize', routeColor.bg, routeColor.text)}>
                  {profile.specialist_routing_sensitivity}
                </Badge>
              </div>
            </div>
          </CollapsibleSection>

          {/* Common Blockers */}
          {profile.common_blocker_types.length > 0 && (
            <>
              <Separator />
              <CollapsibleSection
                title="Common Blockers"
                icon={AlertTriangle}
              >
                <div className="flex flex-wrap gap-1.5">
                  {profile.common_blocker_types.map((blocker, idx) => (
                    <Badge
                      key={idx}
                      className="bg-red-100 text-red-700 text-[10px] font-medium"
                    >
                      {blocker}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Commonly Ignored Actions */}
          {profile.commonly_ignored_actions.length > 0 && (
            <>
              <Separator />
              <CollapsibleSection
                title="Commonly Ignored Actions"
                icon={Shield}
              >
                <div className="flex flex-wrap gap-1.5">
                  {profile.commonly_ignored_actions.map((action, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] font-medium text-muted-foreground"
                    >
                      {action}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Successful Patterns */}
          {profile.common_successful_patterns.length > 0 && (
            <>
              <Separator />
              <CollapsibleSection
                title="Successful Patterns"
                icon={TrendingUp}
              >
                <div className="space-y-1.5">
                  {profile.common_successful_patterns
                    .slice()
                    .sort((a, b) => b.success_rate - a.success_rate)
                    .slice(0, 8)
                    .map((pattern, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {pattern.tool_name}
                        </span>
                        <Badge className="bg-green-100 text-green-700 text-[9px] font-medium">
                          {Math.round(pattern.success_rate * 100)}%
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          {pattern.context}
                        </span>
                      </div>
                    ))}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Failure Patterns */}
          {profile.common_failure_patterns.length > 0 && (
            <>
              <Separator />
              <CollapsibleSection
                title="Failure Patterns"
                icon={TrendingDown}
              >
                <div className="space-y-1.5">
                  {profile.common_failure_patterns
                    .slice()
                    .sort((a, b) => b.failure_rate - a.failure_rate)
                    .slice(0, 8)
                    .map((pattern, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {pattern.tool_name}
                        </span>
                        <Badge className="bg-red-100 text-red-700 text-[9px] font-medium">
                          {Math.round(pattern.failure_rate * 100)}%
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          {pattern.context}
                        </span>
                      </div>
                    ))}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Stats footer */}
          <Separator />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated{' '}
              {formatDistanceToNow(new Date(profile.last_profile_update_at), {
                addSuffix: true,
              })}
            </span>
            <span>{profile.total_cycles_analyzed} cycles analyzed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
