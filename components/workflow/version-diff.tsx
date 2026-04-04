'use client';

import { Plus, Minus, Pencil, GitCompare, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkflowDiff } from '@/lib/services/workflow-diff-service';

interface VersionDiffProps {
  diff: WorkflowDiff;
  versionLabelA?: string;
  versionLabelB?: string;
}

export function VersionDiff({
  diff,
  versionLabelA = 'Previous',
  versionLabelB = 'Current',
}: VersionDiffProps) {
  const hasChanges =
    diff.nodes_added.length > 0 ||
    diff.nodes_removed.length > 0 ||
    diff.nodes_modified.length > 0 ||
    diff.edges_added.length > 0 ||
    diff.edges_removed.length > 0 ||
    diff.trigger_changes.length > 0;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-7">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <GitCompare className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Version Comparison
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {versionLabelA} <ArrowRight className="inline h-3 w-3 mx-1" /> {versionLabelB}
            </p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm font-medium mb-5">{diff.summary}</p>

        {!hasChanges && (
          <p className="text-sm text-muted-foreground">
            These two versions are identical.
          </p>
        )}

        {/* Added Nodes */}
        {diff.nodes_added.length > 0 && (
          <section className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Nodes Added
            </p>
            <div className="space-y-2">
              {diff.nodes_added.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950/40"
                >
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-200 truncate">
                      {node.label}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {node.type}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-green-300 text-green-700 dark:border-green-800 dark:text-green-300 text-[10px]"
                  >
                    added
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Removed Nodes */}
        {diff.nodes_removed.length > 0 && (
          <section className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Nodes Removed
            </p>
            <div className="space-y-2">
              {diff.nodes_removed.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/40"
                >
                  <Minus className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-200 truncate">
                      {node.label}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400">
                      {node.type}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-[10px]"
                  >
                    removed
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Modified Nodes */}
        {diff.nodes_modified.length > 0 && (
          <section className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Nodes Modified
            </p>
            <div className="space-y-2">
              {diff.nodes_modified.map((mod) => (
                <div
                  key={mod.node_id}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900 dark:bg-amber-950/40"
                >
                  <div className="flex items-center gap-3">
                    <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200 truncate flex-1">
                      {mod.label}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 text-[10px]"
                    >
                      modified
                    </Badge>
                  </div>
                  <ul className="mt-2 ml-7 space-y-0.5">
                    {mod.changes.map((change, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-700 dark:text-amber-400"
                      >
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Edge Changes */}
        {(diff.edges_added.length > 0 || diff.edges_removed.length > 0) && (
          <section className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Edge Changes
            </p>
            <div className="space-y-2">
              {diff.edges_added.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950/40"
                >
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-900 dark:text-green-200 truncate flex-1">
                    {edge.source_node_id} <ArrowRight className="inline h-3 w-3 mx-1" />{' '}
                    {edge.target_node_id}
                    {edge.label ? ` (${edge.label})` : ''}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-green-300 text-green-700 dark:border-green-800 dark:text-green-300 text-[10px]"
                  >
                    added
                  </Badge>
                </div>
              ))}
              {diff.edges_removed.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/40"
                >
                  <Minus className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-900 dark:text-red-200 truncate flex-1">
                    {edge.source_node_id} <ArrowRight className="inline h-3 w-3 mx-1" />{' '}
                    {edge.target_node_id}
                    {edge.label ? ` (${edge.label})` : ''}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-[10px]"
                  >
                    removed
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trigger Changes */}
        {diff.trigger_changes.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Trigger Changes
            </p>
            <div className="space-y-2">
              {diff.trigger_changes.map((change, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border px-4 py-2.5"
                >
                  <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">{change}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
