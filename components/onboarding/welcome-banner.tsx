'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkles, FileText, Upload, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'deal-desk-welcome-dismissed';

const steps = [
  {
    number: 1,
    title: 'Create your first transaction',
    description: 'Set up a deal to start tracking documents and deadlines.',
    href: '/transactions/new',
    icon: FileText,
  },
  {
    number: 2,
    title: 'Upload a document',
    description: 'Add a purchase agreement, disclosure, or amendment.',
    href: '/transactions',
    icon: Upload,
  },
  {
    number: 3,
    title: 'Review the generated checklist',
    description: 'See AI-extracted key dates, contingencies, and action items.',
    href: '/transactions',
    icon: ClipboardCheck,
  },
];

export function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored !== 'true') {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  if (!mounted || dismissed) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02]',
        'p-8 shadow-sm transition-all duration-300'
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground/60 transition-colors duration-150 hover:bg-muted hover:text-muted-foreground"
        aria-label="Dismiss welcome banner"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Welcome to Deal Desk
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8">
        Your AI-powered transaction management platform. Streamline document
        processing, automate checklists, and keep every deal on track.
      </p>

      {/* Getting started steps */}
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <Link
            key={step.number}
            href={step.href}
            className={cn(
              'group flex flex-col gap-3 rounded-xl border bg-background/80 p-5',
              'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {step.number}
              </span>
              <step.icon className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium tracking-tight">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center gap-4">
        <Button asChild size="sm" className="rounded-xl px-5">
          <Link href="/getting-started">View full setup guide</Link>
        </Button>
        <button
          onClick={handleDismiss}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
