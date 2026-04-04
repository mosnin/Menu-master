'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ComplianceIssue, PolicyOverride } from '@/types';

interface PolicyEvaluation {
  ruleId: string;
  ruleName: string;
  result: 'pass' | 'warn' | 'block';
  message?: string;
}

interface ComplianceCardProps {
  transactionId: string;
  evaluations: PolicyEvaluation[];
  issues: ComplianceIssue[];
  overrides: PolicyOverride[];
}

const resultConfig: Record<string, { icon: typeof ShieldCheck; label: string; className: string; badgeClass: string }> = {
  pass: {
    icon: ShieldCheck,
    label: 'Pass',
    className: 'text-green-600 dark:text-green-400',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400',
  },
  warn: {
    icon: ShieldAlert,
    label: 'Warn',
    className: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  },
  block: {
    icon: ShieldBan,
    label: 'Block',
    className: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
  },
};

const severityConfig: Record<string, { className: string }> = {
  info: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' },
  warning: { className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
  critical: { className: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' },
};

export function ComplianceCard({
  transactionId,
  evaluations,
  issues,
  overrides,
}: ComplianceCardProps) {
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'under_review' || i.status === 'blocked');
  const hasBlocks = evaluations.some((e) => e.result === 'block');
  const hasWarns = evaluations.some((e) => e.result === 'warn');
  const allPass = evaluations.length > 0 && evaluations.every((e) => e.result === 'pass');
  const activeOverrides = overrides.filter((o) => o.status === 'approved');

  // Determine overall status
  let statusColor = 'border-l-green-500';
  let StatusIcon = ShieldCheck;
  let statusLabel = 'Compliant';
  if (hasBlocks) {
    statusColor = 'border-l-red-500';
    StatusIcon = ShieldBan;
    statusLabel = 'Blocked';
  } else if (hasWarns || openIssues.length > 0) {
    statusColor = 'border-l-amber-500';
    StatusIcon = ShieldAlert;
    statusLabel = 'Warnings';
  }

  return (
    <Card className={cn('rounded-2xl shadow-sm border-l-4', statusColor)}>
      <CardHeader className="pb-3 p-7">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Compliance
          </CardTitle>
          <Badge
            className={cn(
              'text-[10px] font-medium rounded-md px-2 py-0.5',
              hasBlocks
                ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                : hasWarns || openIssues.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400',
            )}
          >
            <StatusIcon className="h-2.5 w-2.5 mr-1" />
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0 space-y-5">
        {/* Policy Evaluation Results */}
        {evaluations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Policy Evaluations
            </p>
            <div className="space-y-1.5">
              {evaluations.map((evaluation) => {
                const config = resultConfig[evaluation.result] ?? resultConfig.pass;
                const EvalIcon = config.icon;
                return (
                  <div
                    key={evaluation.ruleId}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-150 hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EvalIcon className={cn('h-3.5 w-3.5 shrink-0', config.className)} />
                      <span className="text-sm truncate">{evaluation.ruleName}</span>
                    </div>
                    <Badge className={cn('text-[10px] font-medium rounded-md px-2 py-0.5 shrink-0 ml-2', config.badgeClass)}>
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Open Issues Summary */}
        {openIssues.length > 0 && (
          <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
            <div className="flex items-center gap-2.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm font-medium">
                {openIssues.length} Open Issue{openIssues.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const bySeverity: Record<string, number> = {};
                for (const issue of openIssues) {
                  bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
                }
                return Object.entries(bySeverity).map(([severity, count]) => {
                  const sev = severityConfig[severity] ?? severityConfig.info;
                  return (
                    <Badge key={severity} className={cn('text-[10px] font-medium rounded-md px-2 py-0.5', sev.className)}>
                      {count} {severity}
                    </Badge>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Override Status */}
        {activeOverrides.length > 0 && (
          <div className="rounded-lg border border-violet-200/50 bg-violet-50/30 p-3 dark:border-violet-900/30 dark:bg-violet-950/20">
            <div className="flex items-center gap-2.5">
              <Info className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="text-sm">
                <span className="font-medium">{activeOverrides.length}</span>{' '}
                active override{activeOverrides.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* All Pass State */}
        {allPass && openIssues.length === 0 && (
          <div className="flex items-center gap-2.5 rounded-lg border border-green-200/50 bg-green-50/30 p-3 dark:border-green-900/30 dark:bg-green-950/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400">All policies pass</span>
          </div>
        )}

        {/* Empty State */}
        {evaluations.length === 0 && openIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              No policy evaluations yet
            </p>
          </div>
        )}

        {/* Link to full compliance */}
        <Link
          href={`/broker/compliance`}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors duration-150"
        >
          View Full Compliance Queue
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
