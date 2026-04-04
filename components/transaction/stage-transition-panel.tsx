'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StageBadge } from './stage-badge';
import { transitionStageAction, getAvailableStagesAction } from '@/app/actions/stage-actions';
import { ArrowRight, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TransactionStage } from '@/types';
import { useEffect } from 'react';

interface StageTransitionPanelProps {
  transactionId: string;
  currentStage: TransactionStage;
}

export function StageTransitionPanel({ transactionId, currentStage }: StageTransitionPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [availableStages, setAvailableStages] = useState<TransactionStage[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    getAvailableStagesAction(transactionId).then((res) => {
      if (res.data) setAvailableStages(res.data);
    });
  }, [transactionId]);

  async function handleTransition(toStage: TransactionStage) {
    setTransitioning(true);
    const result = await transitionStageAction(transactionId, toStage);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Stage updated', description: `Transaction moved to ${toStage.replace(/_/g, ' ')}.` });
      router.refresh();
    }
    setTransitioning(false);
  }

  if (availableStages.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3 p-7">
        <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Stage
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-0 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Current:</span>
          <StageBadge stage={currentStage} size="md" />
        </div>

        {availableStages.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
              Move to
            </p>
            <div className="flex flex-wrap gap-2">
              {availableStages.map((stage) => (
                <Button
                  key={stage}
                  variant="outline"
                  size="sm"
                  disabled={transitioning}
                  onClick={() => handleTransition(stage)}
                  className="text-[12px] h-8 gap-1.5 rounded-lg"
                >
                  <ArrowRight className="h-3 w-3" />
                  <StageBadge stage={stage} size="sm" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
