'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  PenLine,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { applyFieldCorrectionAction } from '@/app/actions/correction-actions';
import type { ExtractedFieldValue } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldCorrectionPanelProps {
  documentId: string;
  fields: ExtractedFieldValue[];
  onCorrectionApplied?: () => void;
}

// ---------------------------------------------------------------------------
// Confidence badge (reuses color logic from document-list)
// ---------------------------------------------------------------------------

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let colorClass = 'text-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-200/50';
  if (pct < 70) colorClass = 'text-red-600 bg-red-50/70 ring-1 ring-red-200/50';
  else if (pct < 90) colorClass = 'text-amber-700 bg-amber-50/70 ring-1 ring-amber-200/50';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${colorClass}`}
    >
      {pct}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline edit form
// ---------------------------------------------------------------------------

function InlineEditForm({
  field,
  documentId,
  onDone,
}: {
  field: ExtractedFieldValue;
  documentId: string;
  onDone: () => void;
}) {
  const [newValue, setNewValue] = useState(field.corrected_value ?? field.extracted_value);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!newValue.trim()) return;
    startTransition(async () => {
      try {
        await applyFieldCorrectionAction(
          documentId,
          field.field_name,
          field.extracted_value,
          newValue.trim(),
          reason.trim() || undefined,
        );
        onDone();
      } catch {
        // Correction failed — user can retry
      }
    });
  }

  return (
    <div className="rounded-xl border border-blue-200/60 bg-blue-50/20 px-5 py-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <PenLine className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">
          Edit Field
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-1.5 block">
            Original Value
          </label>
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3.5 py-2.5 text-sm text-muted-foreground">
            {field.extracted_value}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-1.5 block">
            New Value
          </label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="rounded-lg text-sm"
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-1.5 block">
          Reason (optional)
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this correction needed?"
          className="min-h-[64px] resize-none rounded-lg text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 rounded-full px-4 text-xs"
          disabled={!newValue.trim() || newValue.trim() === field.extracted_value || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Check className="h-3 w-3 mr-1.5" />
          )}
          Apply Correction
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-4 text-xs"
          onClick={onDone}
        >
          <X className="h-3 w-3 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FieldCorrectionPanel({
  documentId,
  fields,
  onCorrectionApplied,
}: FieldCorrectionPanelProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-5" />
        <h3 className="text-lg font-semibold tracking-tight">No extracted fields</h3>
        <p className="text-sm text-muted-foreground/80 mt-2 max-w-md leading-relaxed">
          Fields will appear here once extraction completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {fields.map((field) => {
        const isEditing = editingFieldId === field.id;
        const hasCorrectedValue = field.corrected_value !== null;

        if (isEditing) {
          return (
            <InlineEditForm
              key={field.id}
              field={field}
              documentId={documentId}
              onDone={() => {
                setEditingFieldId(null);
                onCorrectionApplied?.();
              }}
            />
          );
        }

        return (
          <div
            key={field.id}
            className={`group flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-300 hover:shadow-md hover:shadow-black/[0.04] ${
              hasCorrectedValue
                ? 'border-blue-200/60 bg-blue-50/10'
                : 'hover:bg-muted/10'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
                  {field.field_name.replace(/_/g, ' ')}
                </p>
                {field.is_locked && (
                  <Lock className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                {hasCorrectedValue ? (
                  <>
                    <span className="text-sm text-muted-foreground/50 line-through">
                      {field.extracted_value}
                    </span>
                    <span className="text-sm font-medium text-blue-700">
                      {field.corrected_value}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium">{field.extracted_value}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
              {field.confidence_score != null && (
                <ConfidenceBadge score={field.confidence_score} />
              )}
              {!field.is_locked && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={() => setEditingFieldId(field.id)}
                >
                  <PenLine className="h-3 w-3 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
