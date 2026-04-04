'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartyBreakdown {
  party: string;
  waitingCount: number;
}

interface ResponsivenessSummaryProps {
  openObligations: number;
  overdueCount: number;
  partyBreakdown: PartyBreakdown[];
  avgResponseTime: string;
  mostOverdueItem: string | null;
}

export function ResponsivenessSummary({
  openObligations,
  overdueCount,
  partyBreakdown,
  avgResponseTime,
  mostOverdueItem,
}: ResponsivenessSummaryProps) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Responsiveness
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0">
        <div className="space-y-5">
          {/* Open Obligations */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Open obligations</span>
            <span className="font-semibold tabular-nums">{openObligations}</span>
          </div>

          <Separator />

          {/* Overdue */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overdue</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                overdueCount > 0 && 'text-red-600',
              )}
            >
              {overdueCount}
            </span>
          </div>

          <Separator />

          {/* Avg Response Time */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg response time</span>
            <span className="font-semibold tabular-nums">{avgResponseTime}</span>
          </div>

          {/* Party Breakdown */}
          {partyBreakdown.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-3">
                  Waiting By Party
                </p>
                <div className="space-y-2.5">
                  {partyBreakdown.map((party) => (
                    <div
                      key={party.party}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        {party.party}
                      </span>
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {party.waitingCount} waiting
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Most Overdue Item */}
          {mostOverdueItem && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-2">
                  Most Overdue
                </p>
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200/50 bg-red-50/40 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 leading-relaxed">
                    {mostOverdueItem}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
