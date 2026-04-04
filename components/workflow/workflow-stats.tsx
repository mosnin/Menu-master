'use client';

import { useMemo } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  Zap,
  Settings2,
  LayoutGrid,
  UserCheck,
  Hash,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkflowGraphData, WorkflowVersion } from '@/types';

// Control-flow node types
const CONTROL_TYPES = new Set([
  'start',
  'stop',
  'condition',
  'branch',
  'wait',
  'loop',
  'join',
  'human_checkpoint',
]);

interface WorkflowStatsProps {
  graphData: WorkflowGraphData;
  version?: WorkflowVersion;
}

function statusVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'published':
      return 'success';
    case 'validated':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'archived':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function WorkflowStats({ graphData, version }: WorkflowStatsProps) {
  const stats = useMemo(() => {
    const { nodes, edges, triggers } = graphData;
    const controlCount = nodes.filter((n) => CONTROL_TYPES.has(n.type)).length;
    const domainCount = nodes.length - controlCount;
    const hasHumanCheckpoint = nodes.some((n) => n.type === 'human_checkpoint');

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      triggerCount: triggers.length,
      controlCount,
      domainCount,
      hasHumanCheckpoint,
    };
  }, [graphData]);

  const statItems = [
    {
      label: 'Total Nodes',
      value: stats.totalNodes,
      icon: Boxes,
    },
    {
      label: 'Total Edges',
      value: stats.totalEdges,
      icon: ArrowRightLeft,
    },
    {
      label: 'Triggers',
      value: stats.triggerCount,
      icon: Zap,
    },
    {
      label: 'Control Nodes',
      value: stats.controlCount,
      icon: Settings2,
    },
    {
      label: 'Domain Nodes',
      value: stats.domainCount,
      icon: LayoutGrid,
    },
    {
      label: 'Human Checkpoints',
      value: stats.hasHumanCheckpoint ? 'Yes' : 'No',
      icon: UserCheck,
    },
  ];

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-7">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-5">
          Graph Statistics
        </p>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl bg-muted/30 p-3 flex items-start gap-3"
              >
                <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums mt-0.5">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Version info */}
        {version && (
          <div className="mt-5 rounded-xl bg-muted/30 p-4 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Version Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">
                  Version <span className="font-semibold">{version.version_number}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(version.status)}>
                  {version.status}
                </Badge>
              </div>
              {version.published_at && (
                <div className="col-span-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Published{' '}
                    {new Date(version.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
