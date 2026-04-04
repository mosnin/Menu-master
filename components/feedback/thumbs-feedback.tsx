'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { submitFeedbackAction } from '@/app/actions/analytics-actions';

interface ThumbsFeedbackProps {
  featureArea: string;
  entityType?: string;
  entityId?: string;
  label?: string;
}

export function ThumbsFeedback({ featureArea, entityType, entityId, label }: ThumbsFeedbackProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick(type: 'up' | 'down') {
    if (submitted) return;

    setSubmitted(type);
    setShowThanks(true);

    startTransition(async () => {
      try {
        await submitFeedbackAction({
          feedbackType: type === 'up' ? 'thumbs_up' : 'thumbs_down',
          featureArea,
          entityType,
          entityId,
        });
      } catch {
        // Silently handle
      }
    });

    setTimeout(() => setShowThanks(false), 2000);
  }

  if (showThanks) {
    return (
      <span className="text-xs text-muted-foreground/70 animate-in fade-in duration-200">
        Thanks!
      </span>
    );
  }

  if (submitted) return null;

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-xs text-muted-foreground/60 mr-0.5">{label}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors duration-150"
        onClick={() => handleClick('up')}
        disabled={isPending}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-150"
        onClick={() => handleClick('down')}
        disabled={isPending}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
