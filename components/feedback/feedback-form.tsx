'use client';

import { useState, useTransition } from 'react';
import { MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { submitFeedbackAction } from '@/app/actions/analytics-actions';

interface FeedbackFormProps {
  trigger?: React.ReactNode;
}

const FEATURE_AREAS = [
  'Transaction',
  'Documents',
  'Approvals',
  'Queue',
  'Recommendations',
  'Exceptions',
  'Settings',
  'Other',
] as const;

type FeedbackType = 'text' | 'issue_report';

export function FeedbackForm({ trigger }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('text');
  const [featureArea, setFeatureArea] = useState<string>('Other');
  const [body, setBody] = useState('');
  const [thumbs, setThumbs] = useState<'up' | 'down' | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setFeedbackType('text');
    setFeatureArea('Other');
    setBody('');
    setThumbs(null);
    setSuccess(false);
  }

  function handleSubmit() {
    if (!body.trim()) return;

    startTransition(async () => {
      try {
        await submitFeedbackAction({
          feedbackType: feedbackType === 'issue_report' ? 'issue_report' : 'text',
          featureArea: featureArea.toLowerCase(),
          body: body.trim(),
          rating: thumbs === 'up' ? 5 : thumbs === 'down' ? 1 : undefined,
        });
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 2000);
      } catch {
        // Silently handle
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2 h-8 px-2.5 text-muted-foreground hover:text-foreground text-[13px]">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        {success ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 ring-1 ring-green-200/40">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-semibold tracking-tight">Thank you for your feedback</p>
            <p className="text-xs text-muted-foreground text-center">
              Your input helps us improve the product.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b">
              <h2 className="text-base font-semibold tracking-tight">Send Feedback</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Help us improve your experience.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Feedback type */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Type
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackType('text')}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150',
                      feedbackType === 'text'
                        ? 'border-foreground/20 bg-foreground/[0.04] text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/30',
                    )}
                  >
                    Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType('issue_report')}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150',
                      feedbackType === 'issue_report'
                        ? 'border-foreground/20 bg-foreground/[0.04] text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/30',
                    )}
                  >
                    Report Issue
                  </button>
                </div>
              </div>

              {/* Feature area */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Feature Area
                </Label>
                <select
                  value={featureArea}
                  onChange={(e) => setFeatureArea(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow duration-150"
                >
                  {FEATURE_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {feedbackType === 'issue_report' ? 'Describe the issue' : 'Your feedback'}
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  placeholder={
                    feedbackType === 'issue_report'
                      ? 'What went wrong? Steps to reproduce...'
                      : 'What could be better? What do you like?'
                  }
                  rows={5}
                  className="resize-none rounded-lg text-sm"
                />
                <p className="text-[10px] text-muted-foreground/60 text-right tabular-nums">
                  {body.length}/2000
                </p>
              </div>

              {/* Optional thumbs rating */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overall experience (optional)
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setThumbs(thumbs === 'up' ? null : 'up')}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm transition-colors duration-150',
                      thumbs === 'up'
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-border text-muted-foreground hover:bg-muted/30',
                    )}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbs(thumbs === 'down' ? null : 'down')}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm transition-colors duration-150',
                      thumbs === 'down'
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-border text-muted-foreground hover:bg-muted/30',
                    )}
                  >
                    👎
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4">
              <Button
                onClick={handleSubmit}
                disabled={!body.trim() || isPending}
                className="w-full rounded-lg h-9 text-sm"
              >
                {isPending ? 'Sending...' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
