'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, AlertTriangle, Bot, User } from 'lucide-react';

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

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  in_progress: <Clock className="h-5 w-5 text-blue-600" />,
  pending: <Circle className="h-5 w-5 text-muted-foreground" />,
  needs_review: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  skipped: <Circle className="h-5 w-5 text-muted-foreground/50" />,
};

const sourceLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  ai_generated: { label: 'AI Generated', icon: <Bot className="h-3 w-3" /> },
  template: { label: 'Template', icon: null },
  manual: { label: 'Manual', icon: <User className="h-3 w-3" /> },
};

export function ChecklistView({ items, onStatusChange }: ChecklistViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No checklist items yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload documents to auto-generate a checklist, or add items manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'completed';
        const source = sourceLabels[item.source] ?? sourceLabels.manual;

        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              isOverdue ? 'border-red-200 bg-red-50/50' : ''
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
              <div className="flex items-center gap-2 mt-1.5">
                {item.due_date && (
                  <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                    {isOverdue ? 'Overdue: ' : 'Due: '}
                    {new Date(item.due_date).toLocaleDateString()}
                  </Badge>
                )}
                {item.requires_review && (
                  <Badge variant="warning" className="text-xs">Needs Review</Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {source.icon}
                  {source.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
