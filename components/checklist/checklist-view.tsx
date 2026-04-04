'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Bot,
  User,
  LayoutTemplate,
  Filter,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  source: string;
  requires_review: boolean;
  completed_at: string | null;
}

interface ChecklistViewProps {
  items: ChecklistItem[];
  onStatusChange?: (itemId: string, status: string) => void;
}

type FilterMode = 'all' | 'pending' | 'overdue';

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  in_progress: <Clock className="h-5 w-5 text-blue-600" />,
  pending: <Circle className="h-5 w-5 text-muted-foreground" />,
  needs_review: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  skipped: <Circle className="h-5 w-5 text-muted-foreground/50" />,
};

const statusOrder: Record<string, number> = {
  needs_review: 0,
  in_progress: 1,
  pending: 2,
  completed: 3,
  skipped: 4,
};

const statusGroupLabels: Record<string, string> = {
  needs_review: 'Needs Review',
  in_progress: 'In Progress',
  pending: 'Pending',
  completed: 'Completed',
  skipped: 'Skipped',
};

const sourceConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  ai_generated: {
    label: 'AI Generated',
    icon: <Bot className="h-3 w-3" />,
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  template: {
    label: 'Template',
    icon: <LayoutTemplate className="h-3 w-3" />,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  manual: {
    label: 'Manual',
    icon: <User className="h-3 w-3" />,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
};

export function ChecklistView({ items, onStatusChange }: ChecklistViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No checklist items yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Upload documents to auto-generate a checklist, or add items manually.
        </p>
      </div>
    );
  }

  const now = new Date();
  const completedCount = items.filter(i => i.status === 'completed').length;
  const overdueCount = items.filter(i => i.due_date && new Date(i.due_date) < now && i.status !== 'completed').length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  // Filter items
  const filteredItems = items.filter(item => {
    if (filter === 'pending') return item.status !== 'completed' && item.status !== 'skipped';
    if (filter === 'overdue') return item.due_date && new Date(item.due_date) < now && item.status !== 'completed';
    return true;
  });

  // Group by status
  const groups = filteredItems.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = item.status || 'pending';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(groups).sort(
    (a, b) => (statusOrder[a] ?? 99) - (statusOrder[b] ?? 99)
  );

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {completedCount} of {items.length} completed
            </span>
            <span className="text-sm text-muted-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 border-b pb-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {([
          ['all', 'All'],
          ['pending', 'Pending'],
          ['overdue', 'Overdue'],
        ] as [FilterMode, string][]).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'ghost'}
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter(key)}
          >
            {label}
            {key === 'overdue' && overdueCount > 0 && (
              <span className="ml-1 rounded-full bg-red-100 text-red-700 px-1.5 text-xs">
                {overdueCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Grouped items */}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No items match the current filter.
        </p>
      ) : (
        <div className="space-y-5">
          {sortedGroupKeys.map(groupKey => (
            <div key={groupKey}>
              <div className="flex items-center gap-2 mb-2">
                {statusIcons[groupKey]}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {statusGroupLabels[groupKey] ?? groupKey} ({groups[groupKey].length})
                </h4>
              </div>
              <div className="space-y-2">
                {groups[groupKey].map((item) => {
                  const isOverdue = item.due_date && new Date(item.due_date) < now && item.status !== 'completed';
                  const source = sourceConfig[item.source] ?? sourceConfig.manual;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isOverdue
                          ? 'border-red-300 bg-red-50/60 shadow-sm shadow-red-100'
                          : item.status === 'completed'
                          ? 'bg-muted/30 border-muted'
                          : ''
                      }`}
                    >
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={() => {
                          const next = item.status === 'completed' ? 'pending' : 'completed';
                          onStatusChange?.(item.id, next);
                        }}
                      >
                        {statusIcons[item.status] ?? statusIcons.pending}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.due_date && (
                            <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs flex items-center gap-1">
                              {isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {isOverdue ? 'Overdue: ' : 'Due: '}
                              {new Date(item.due_date).toLocaleDateString()}
                            </Badge>
                          )}
                          {item.requires_review && (
                            <Badge variant="warning" className="text-xs">Needs Review</Badge>
                          )}
                          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${source.className}`}>
                            {source.icon}
                            {source.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
