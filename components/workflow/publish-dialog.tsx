'use client';

import { useState } from 'react';
import { Rocket, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PublishDialogProps {
  versionId: string;
  versionNumber: number;
  isValidated: boolean;
  onPublish: () => void;
  onClose: () => void;
}

export function PublishDialog({
  versionId,
  versionNumber,
  isValidated,
  onPublish,
  onClose,
}: PublishDialogProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      onPublish();
    } finally {
      // The parent should handle closing; keep loading state
      // until unmount in case onPublish is async
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog card */}
      <Card className="relative z-10 w-full max-w-md rounded-2xl shadow-xl mx-4">
        <CardContent className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Publish Workflow
              </p>
              <p className="text-base font-semibold mt-0.5">
                Version {versionNumber}
              </p>
            </div>
          </div>

          {/* Version info */}
          <div className="rounded-xl bg-muted/30 p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Version ID
              </span>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                {versionId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Validation
              </span>
              {isValidated ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Validated
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Not Validated
                </Badge>
              )}
            </div>
          </div>

          {/* Warning when not validated */}
          {!isValidated && (
            <div className="flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 p-4 mb-5">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                This version has not been validated. Please validate the workflow graph before
                publishing.
              </p>
            </div>
          )}

          {/* Confirmation text */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Publishing will make this version active. Previously published versions will be
            archived.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!isValidated || isPublishing}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
