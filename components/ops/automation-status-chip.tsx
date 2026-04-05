'use client';

import { Badge } from '@/components/ui/badge';
import { toStatusLabel, toStatusTone } from '@/lib/ui/automation-status';

export function AutomationStatusChip({ status }: { status: string }) {
  return (
    <Badge variant={toStatusTone(status)} className="text-[10px] uppercase tracking-wide">
      {toStatusLabel(status)}
    </Badge>
  );
}
