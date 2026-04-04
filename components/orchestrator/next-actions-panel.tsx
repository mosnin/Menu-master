'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Zap, X, Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrchestratorNextAction, ActionRiskClass, NextActionUrgency } from '@/types';

interface NextActionsPanelProps {
  actions: OrchestratorNextAction[];
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const riskClassConfig: Record<ActionRiskClass, { label: string; className: string }> = {
  safe: { label: 'Safe', className: 'bg-green-100 text-green-700' },
  medium_risk: { label: 'Medium Risk', className: 'bg-amber-100 text-amber-700' },
  high_risk: { label: 'High Risk', className: 'bg-red-100 text-red-700' },
};

const urgencyConfig: Record<NextActionUrgency, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

function ActionCard({
  action,
  isPrimary,
  onDismiss,
  onResolve,
}: {
  action: OrchestratorNextAction;
  isPrimary: boolean;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const risk = riskClassConfig[action.risk_class] ?? riskClassConfig.safe;
  const urgency = urgencyConfig[action.urgency] ?? urgencyConfig.normal;

  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm transition-colors duration-150',
        isPrimary && 'border-primary/30 bg-primary/[0.02]',
      )}
    >
      <CardContent className={cn('px-5 py-4', isPrimary && 'px-6 py-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isPrimary && (
                <Badge className="bg-primary/10 text-primary text-[10px] font-medium">
                  Primary
                </Badge>
              )}
              <Badge className={cn('text-[10px] font-medium', urgency.className)}>
                {urgency.label}
              </Badge>
              <Badge className={cn('text-[10px] font-medium', risk.className)}>
                <Shield className="h-2.5 w-2.5 mr-1" />
                {risk.label}
              </Badge>
              {action.auto_executable && (
                <Badge className="bg-violet-100 text-violet-700 text-[10px] font-medium">
                  <Zap className="h-2.5 w-2.5 mr-1" />
                  Auto
                </Badge>
              )}
              {action.owner_role && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  {action.owner_role}
                </Badge>
              )}
            </div>
            <p className={cn('font-semibold tracking-tight', isPrimary ? 'text-sm' : 'text-xs')}>
              {action.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.reason}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onResolve && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onResolve(action.id)}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => onDismiss(action.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NextActionsPanel({ actions, onDismiss, onResolve }: NextActionsPanelProps) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="rounded-xl bg-green-50 p-3 mb-3">
          <Check className="h-5 w-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold tracking-tight mb-0.5">No actions recommended</p>
        <p className="text-xs text-muted-foreground">Everything looks good for now.</p>
      </div>
    );
  }

  const primary = actions.find((a) => a.is_primary);
  const supporting = actions.filter((a) => !a.is_primary);

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Recommended Actions
      </p>

      {primary && (
        <ActionCard
          action={primary}
          isPrimary
          onDismiss={onDismiss}
          onResolve={onResolve}
        />
      )}

      {supporting.length > 0 && (
        <div className="space-y-2">
          {supporting.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              isPrimary={false}
              onDismiss={onDismiss}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
