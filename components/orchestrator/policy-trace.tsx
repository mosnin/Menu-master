'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  ChevronRight,
  AlertTriangle,
  Check,
  Ban,
  FileEdit,
  Zap,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionDisposition, ActionRiskClass } from '@/types';

export interface PolicyTraceAction {
  tool_name: string;
  risk_class: string;
  confidence: number;
  disposition: string;
  policy_rule: string;
  reason: string;
  escalation_target?: string;
  can_override: boolean;
}

interface PolicyTraceProps {
  action: PolicyTraceAction;
}

const riskClassConfig: Record<string, { label: string; className: string }> = {
  safe: { label: 'Safe', className: 'bg-green-100 text-green-700' },
  medium_risk: { label: 'Medium Risk', className: 'bg-amber-100 text-amber-700' },
  high_risk: { label: 'High Risk', className: 'bg-red-100 text-red-700' },
};

const dispositionConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  auto_execute: {
    label: 'Auto Execute',
    className: 'bg-green-100 text-green-700',
    icon: Zap,
  },
  create_draft: {
    label: 'Create Draft',
    className: 'bg-amber-100 text-amber-700',
    icon: FileEdit,
  },
  create_approval: {
    label: 'Require Approval',
    className: 'bg-blue-100 text-blue-700',
    icon: Shield,
  },
  block: {
    label: 'Blocked',
    className: 'bg-red-100 text-red-700',
    icon: Ban,
  },
};

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80
              ? 'bg-green-500'
              : pct >= 50
                ? 'bg-amber-500'
                : 'bg-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

function PolicyTraceContent({ action }: PolicyTraceProps) {
  const risk = riskClassConfig[action.risk_class] ?? riskClassConfig.safe;
  const disposition = dispositionConfig[action.disposition] ?? dispositionConfig.auto_execute;
  const DispositionIcon = disposition.icon;

  return (
    <div className="space-y-4">
      {/* Action */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
          Action
        </p>
        <p className="text-sm font-semibold tracking-tight">
          {formatToolName(action.tool_name)}
        </p>
      </div>

      <Separator />

      {/* Risk & Confidence row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
            Risk Class
          </p>
          <Badge className={cn('text-[10px] font-medium', risk.className)}>
            <Shield className="h-2.5 w-2.5 mr-1" />
            {risk.label}
          </Badge>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
            Confidence
          </p>
          <ConfidenceBar value={action.confidence} />
        </div>
      </div>

      <Separator />

      {/* Policy Rule */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
          Policy Rule Applied
        </p>
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <p className="text-xs font-mono text-muted-foreground">{action.policy_rule}</p>
        </div>
      </div>

      {/* Disposition */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
          Disposition
        </p>
        <Badge className={cn('text-[10px] font-medium', disposition.className)}>
          <DispositionIcon className="h-2.5 w-2.5 mr-1" />
          {disposition.label}
        </Badge>
      </div>

      {/* Reason */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
          Reason
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{action.reason}</p>
      </div>

      <Separator />

      {/* Escalation & Override row */}
      <div className="grid grid-cols-2 gap-4">
        {action.escalation_target && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
              Escalation Target
            </p>
            <p className="text-xs font-medium">{action.escalation_target}</p>
          </div>
        )}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
            Can Override
          </p>
          <Badge
            className={cn(
              'text-[10px] font-medium',
              action.can_override
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600',
            )}
          >
            {action.can_override ? (
              <>
                <Check className="h-2.5 w-2.5 mr-1" />
                Yes
              </>
            ) : (
              <>
                <Ban className="h-2.5 w-2.5 mr-1" />
                No
              </>
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function PolicyTraceDialog({
  action,
  trigger,
}: PolicyTraceProps & { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-lg"
          >
            <Info className="h-3 w-3 mr-1" />
            Why?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Policy Trace
          </DialogTitle>
        </DialogHeader>
        <PolicyTraceContent action={action} />
      </DialogContent>
    </Dialog>
  );
}

export function PolicyTraceInline({ action }: PolicyTraceProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')}
        />
        Policy trace
      </button>
      {expanded && (
        <div className="mt-2 pl-4 border-l-2 border-muted">
          <PolicyTraceContent action={action} />
        </div>
      )}
    </div>
  );
}
