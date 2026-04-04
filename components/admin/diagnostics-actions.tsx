'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { runDiagnosticsAction } from '@/app/actions/diagnostics-actions';
import { createRecomputeJobAction } from '@/app/actions/recompute-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Activity, RefreshCw, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { RecomputeJobType } from '@/types';

const recomputeOptions: { type: RecomputeJobType; label: string }[] = [
  { type: 'recompute_completeness', label: 'Recompute Completeness Scores' },
  { type: 'recompute_health_score', label: 'Recompute Health Scores' },
  { type: 'recompute_closing_readiness', label: 'Recompute Closing Readiness' },
  { type: 'recompute_forecast', label: 'Recompute Forecast' },
  { type: 'recompute_compliance', label: 'Recompute Compliance' },
  { type: 'rebuild_search_index', label: 'Rebuild Search Index' },
];

export function DiagnosticsActions() {
  const { toast } = useToast();
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleRunDiagnostics() {
    setRunning(true);
    const result = await runDiagnosticsAction();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Diagnostics complete', description: `${result.data?.length ?? 0} checks completed.` });
      router.refresh();
    }
    setRunning(false);
  }

  async function handleRecompute(jobType: RecomputeJobType) {
    const result = await createRecomputeJobAction(jobType);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Recompute queued', description: 'Job has been queued for processing.' });
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRunDiagnostics}
        disabled={running}
        className="text-[12px] gap-1.5 rounded-lg"
      >
        <Activity className={`h-3.5 w-3.5 ${running ? 'animate-pulse' : ''}`} />
        {running ? 'Running...' : 'Run Diagnostics'}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-[12px] gap-1.5 rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" />
            Recompute
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {recomputeOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.type}
              onClick={() => handleRecompute(opt.type)}
              className="text-[13px]"
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
