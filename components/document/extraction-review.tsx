import {
  FileCheck,
  FileText,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ExtractedFieldValue, FieldCorrection } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractionReviewProps {
  documentType: string | null;
  confidenceScore: number | null;
  fields: ExtractedFieldValue[];
  corrections: FieldCorrection[];
}

// ---------------------------------------------------------------------------
// Sub-components
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

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let barColor = 'from-emerald-400 via-emerald-500 to-emerald-400';
  if (pct < 70) barColor = 'from-red-400 via-red-500 to-red-400';
  else if (pct < 90) barColor = 'from-amber-400 via-amber-500 to-amber-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

function formatDocumentType(type: string | null) {
  if (!type) return 'Unclassified';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExtractionReview({
  documentType,
  confidenceScore,
  fields,
  corrections,
}: ExtractionReviewProps) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-5" />
        <h3 className="text-lg font-semibold tracking-tight">No extraction results</h3>
        <p className="text-sm text-muted-foreground/80 mt-2 max-w-md leading-relaxed">
          Results will appear once the document has been processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Document overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3.5 py-4 px-5">
            <div className="rounded-full bg-blue-50/70 p-2.5">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide">
                Document Type
              </p>
              <p className="text-sm font-semibold tracking-tight mt-0.5">
                {formatDocumentType(documentType)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="py-4 px-5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-emerald-50/70 p-2.5">
                <FileCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide">
                  Confidence
                </p>
              </div>
            </div>
            {confidenceScore != null ? (
              <ConfidenceBar score={confidenceScore} />
            ) : (
              <p className="text-sm text-muted-foreground/60">Not available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extracted fields table */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3.5">
          Extracted Fields ({fields.length})
        </p>
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 bg-muted/20 px-5 py-3 border-b">
            <div className="col-span-3">
              <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                Field
              </span>
            </div>
            <div className="col-span-4">
              <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                Extracted Value
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                Corrected Value
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                Confidence
              </span>
            </div>
          </div>

          {/* Rows */}
          {fields.map((field, i) => {
            const hasCorrectedValue = field.corrected_value !== null;
            return (
              <div
                key={field.id}
                className={`grid grid-cols-12 gap-4 items-center px-5 py-3.5 transition-colors duration-150 hover:bg-muted/10 ${
                  i < fields.length - 1 ? 'border-b border-border/40' : ''
                } ${hasCorrectedValue ? 'bg-blue-50/10' : ''}`}
              >
                <div className="col-span-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {field.field_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <div className="col-span-4">
                  <span
                    className={`text-sm ${
                      hasCorrectedValue
                        ? 'line-through text-muted-foreground/50'
                        : 'font-medium'
                    }`}
                  >
                    {field.extracted_value}
                  </span>
                </div>
                <div className="col-span-3">
                  {hasCorrectedValue ? (
                    <span className="text-sm font-medium text-blue-700">
                      {field.corrected_value}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/40">--</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {field.confidence_score != null ? (
                    <ConfidenceBadge score={field.confidence_score} />
                  ) : (
                    <span className="text-[11px] text-muted-foreground/40">--</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Correction history */}
      {corrections.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3.5">
            <History className="h-4 w-4 text-muted-foreground/50" />
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Correction History ({corrections.length})
            </p>
          </div>
          <div className="space-y-2.5">
            {corrections.map((correction) => (
              <div
                key={correction.id}
                className="flex items-start gap-4 rounded-xl border px-5 py-4 hover:bg-muted/10 transition-colors duration-200"
              >
                <div className="shrink-0 rounded-lg bg-blue-50/40 p-2 mt-0.5">
                  <History className="h-3.5 w-3.5 text-blue-600/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm text-muted-foreground/50 line-through">
                      {correction.previous_value}
                    </span>
                    <span className="text-muted-foreground/30">&rarr;</span>
                    <span className="text-sm font-medium text-blue-700">
                      {correction.new_value}
                    </span>
                  </div>
                  {correction.correction_reason && (
                    <p className="text-xs text-muted-foreground/70 mt-1.5 leading-relaxed">
                      {correction.correction_reason}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/50 mt-2">
                    {new Date(correction.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
