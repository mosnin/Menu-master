'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Percent,
  ArrowRight,
  Edit3,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransactionEconomics, CommissionSplit } from '@/types';

interface EconomicsPanelProps {
  economics: TransactionEconomics | null;
  splits: CommissionSplit[];
  userRole: 'agent' | 'coordinator' | 'broker_admin';
  onEdit?: () => void;
  onFinalize?: () => void;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number | null): string {
  if (value == null) return '--';
  return `${Math.round(value * 10) / 10}%`;
}

export function EconomicsPanel({
  economics,
  splits,
  userRole,
  onEdit,
  onFinalize,
}: EconomicsPanelProps) {
  if (!economics) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 p-7">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Transaction Economics
          </CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold tracking-tight">No economics data</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Add purchase price, commission details, and split information.
            </p>
            {(userRole === 'coordinator' || userRole === 'broker_admin') && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={onEdit}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Add Economics
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const brokeragePct = economics.brokerage_split_pct;
  const agentPct = 100 - brokeragePct;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Transaction Economics
          </CardTitle>
          <div className="flex items-center gap-2">
            {economics.is_finalized ? (
              <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                Finalized
              </Badge>
            ) : (
              <Badge className="text-[10px] font-medium rounded-md px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                Projected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0 space-y-6">
        {/* Core Figures */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Purchase Price</p>
            <p className="text-lg font-semibold tracking-tight tabular-nums">
              {formatCurrency(economics.purchase_price)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Commission ({economics.commission_type === 'percentage' ? formatPct(economics.commission_rate) : 'Flat'})
            </p>
            <p className="text-lg font-semibold tracking-tight tabular-nums">
              {formatCurrency(economics.commission_amount)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gross Commission</p>
            <p className="text-lg font-semibold tracking-tight tabular-nums">
              {formatCurrency(economics.gross_commission)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Representation</p>
            <p className="text-sm font-medium capitalize">{economics.representation_side}</p>
          </div>
        </div>

        {/* Brokerage Split Visualization */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Brokerage Split
          </p>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${agentPct}%` }}
              title={`Agent: ${formatPct(agentPct)}`}
            />
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${brokeragePct}%` }}
              title={`Brokerage: ${formatPct(brokeragePct)}`}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">
                Agent {formatPct(agentPct)}: {formatCurrency(economics.agent_share)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-muted-foreground">
                Brokerage {formatPct(brokeragePct)}: {formatCurrency(economics.brokerage_share)}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Fee */}
        {economics.has_referral && (
          <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Referral Fee</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formatCurrency(economics.referral_fee_amount)}
                  {economics.referral_fee_pct != null && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      ({formatPct(economics.referral_fee_pct)})
                    </span>
                  )}
                </p>
              </div>
              {economics.referral_party_name && (
                <span className="text-xs text-muted-foreground">{economics.referral_party_name}</span>
              )}
            </div>
          </div>
        )}

        {/* Net Brokerage Revenue */}
        <div className="rounded-lg border-2 border-green-200/60 bg-green-50/40 p-4 dark:border-green-900/40 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Net Brokerage Revenue
              </p>
              <p className="text-2xl font-bold tracking-tight mt-1 text-green-700 dark:text-green-400 tabular-nums">
                {formatCurrency(economics.net_brokerage_revenue)}
              </p>
            </div>
            <div className="rounded-lg bg-green-100/80 p-2.5 dark:bg-green-950/40">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Close Probability + Expected Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Close Probability</p>
              <p className="text-sm font-semibold mt-0.5 tabular-nums">
                {economics.close_probability != null ? `${economics.close_probability}%` : '--'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/40">
              <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Close</p>
              <p className="text-sm font-semibold mt-0.5">
                {economics.expected_close_date
                  ? new Date(economics.expected_close_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Commission Splits Table */}
        {splits.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Commission Splits
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground py-2.5 px-3 text-xs">Recipient</th>
                    <th className="text-left font-medium text-muted-foreground py-2.5 px-3 text-xs">Type</th>
                    <th className="text-right font-medium text-muted-foreground py-2.5 px-3 text-xs">Split</th>
                    <th className="text-right font-medium text-muted-foreground py-2.5 px-3 text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((split) => (
                    <tr key={split.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors duration-150">
                      <td className="py-2.5 px-3 font-medium">{split.recipient_name}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-[10px] rounded-md px-2 py-0">
                          {split.recipient_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {split.split_pct != null ? formatPct(split.split_pct) : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                        {formatCurrency(split.split_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {(userRole === 'coordinator' || userRole === 'broker_admin') && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={onEdit}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          {userRole === 'broker_admin' && !economics.is_finalized && onFinalize && (
            <Button
              size="sm"
              className="rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
              onClick={onFinalize}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Finalize
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
