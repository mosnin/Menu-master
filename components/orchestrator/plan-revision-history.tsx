'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Clock, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PlanRevision } from '@/types';

interface PlanRevisionHistoryProps {
  revisions: PlanRevision[];
}

export function PlanRevisionHistory({ revisions }: PlanRevisionHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (revisions.length === 0) {
    return null;
  }

  // Show at most 10 revisions, newest first
  const display = [...revisions]
    .sort((a, b) => b.revision_number - a.revision_number)
    .slice(0, 10);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 mr-1.5" />
        ) : (
          <ChevronRight className="h-3 w-3 mr-1.5" />
        )}
        Revision History ({revisions.length})
      </Button>

      {expanded && (
        <div className="mt-3 relative ml-3">
          {/* Timeline line */}
          <div className="absolute left-0 top-1 bottom-1 w-px bg-border" />

          <div className="space-y-4">
            {display.map((rev) => (
              <div key={rev.id} className="relative pl-5">
                {/* Timeline dot */}
                <div className="absolute left-[-3px] top-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium tabular-nums"
                    >
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      v{rev.revision_number}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(rev.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {rev.reason}
                  </p>
                  {rev.changes_summary && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {rev.changes_summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
