'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AutomationPageStateProps = {
  loading: boolean;
  loadingMessage: string;
  orgError?: string | null;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
};

export function AutomationPageState({
  loading,
  loadingMessage,
  orgError,
  error,
  onRetry,
  children,
}: AutomationPageStateProps) {
  return (
    <>
      {orgError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {orgError}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground flex items-center justify-between gap-3">
            <span>{loadingMessage}</span>
            {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          {children}
        </>
      )}
    </>
  );
}
