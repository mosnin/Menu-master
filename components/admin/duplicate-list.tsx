'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveDuplicateAction, runDuplicateDetectionAction } from '@/app/actions/duplicate-actions';
import { useToast } from '@/hooks/use-toast';
import { humanizeStatus, formatPercent } from '@/lib/format';
import { Check, X, Minus, RefreshCw, ArrowLeftRight } from 'lucide-react';
import type { DuplicateCandidate } from '@/types';

interface DuplicateListProps {
  initialCandidates: DuplicateCandidate[];
}

export function DuplicateList({ initialCandidates }: DuplicateListProps) {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [detecting, setDetecting] = useState(false);

  async function handleResolve(id: string, resolution: 'merged' | 'not_duplicate' | 'ignored') {
    const result = await resolveDuplicateAction(id, resolution);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Resolved', description: `Marked as ${resolution.replace(/_/g, ' ')}` });
    }
  }

  async function handleRunDetection(entityType: 'contact' | 'transaction') {
    setDetecting(true);
    const result = await runDuplicateDetectionAction(entityType);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Detection complete', description: `Found ${result.data?.count ?? 0} potential duplicates.` });
    }
    setDetecting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRunDetection('contact')}
          disabled={detecting}
          className="text-[12px] gap-1.5 rounded-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${detecting ? 'animate-spin' : ''}`} />
          Scan Contacts
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRunDetection('transaction')}
          disabled={detecting}
          className="text-[12px] gap-1.5 rounded-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${detecting ? 'animate-spin' : ''}`} />
          Scan Transactions
        </Button>
      </div>

      <div className="space-y-3">
        {candidates.map((c) => (
          <Card key={c.id} className="rounded-2xl shadow-sm">
            <CardContent className="flex items-center gap-4 py-4 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 shrink-0">
                <ArrowLeftRight className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {humanizeStatus(c.entity_type)}
                  </Badge>
                  <span className="text-[12px] font-medium text-amber-600">
                    {formatPercent(c.similarity_score * 100)} match
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground/60">
                  <span className="font-mono text-[11px]">{c.entity_a_id.slice(0, 8)}</span>
                  <ArrowLeftRight className="h-3 w-3" />
                  <span className="font-mono text-[11px]">{c.entity_b_id.slice(0, 8)}</span>
                </div>
                {c.match_fields.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.match_fields.map((f: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {f.field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Not a duplicate"
                  onClick={() => handleResolve(c.id, 'not_duplicate')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Ignore"
                  onClick={() => handleResolve(c.id, 'ignored')}
                >
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 text-[12px]"
                  title="Merge"
                  onClick={() => handleResolve(c.id, 'merged')}
                >
                  <Check className="h-3.5 w-3.5" />
                  Merge
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
