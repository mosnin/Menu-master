'use client';

import { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Eye,
  ScanSearch,
  ChevronDown,
  ChevronRight,
  PenLine,
  FileWarning,
  FileBadge,
  FileCheck,
  FileX,
} from 'lucide-react';

interface ExtractionResult {
  field: string;
  value: string;
  confidence: number;
}

interface DocumentItem {
  id: string;
  file_name: string;
  document_type: string | null;
  processing_status: string;
  created_at: string;
  confidence_score?: number | null;
  missing_signatures?: string[] | null;
  has_addenda?: boolean;
  addenda_count?: number;
  extraction_results?: ExtractionResult[] | null;
}

interface DocumentListProps {
  documents: DocumentItem[];
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: 'Pending', icon: <Clock className="h-3.5 w-3.5" />, className: 'bg-gray-100/80 text-gray-600' },
  processing: { label: 'Processing', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'bg-blue-50/80 text-blue-600' },
  completed: { label: 'Extracted', icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'bg-emerald-50/80 text-emerald-600' },
  failed: { label: 'Failed', icon: <AlertCircle className="h-3.5 w-3.5" />, className: 'bg-red-50/80 text-red-600' },
  ocr_required: { label: 'OCR Required', icon: <ScanSearch className="h-3.5 w-3.5" />, className: 'bg-amber-50/80 text-amber-600' },
  manual_review: { label: 'Manual Review', icon: <Eye className="h-3.5 w-3.5" />, className: 'bg-amber-50/80 text-amber-600' },
};

const docTypeConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  purchase_agreement: { label: 'Purchase Agreement', icon: <FileBadge className="h-3 w-3" />, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  addendum: { label: 'Addendum', icon: <FileText className="h-3 w-3" />, className: 'bg-purple-50 text-purple-700 border-purple-200' },
  inspection_report: { label: 'Inspection', icon: <FileCheck className="h-3 w-3" />, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disclosure: { label: 'Disclosure', icon: <FileText className="h-3 w-3" />, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  title_report: { label: 'Title Report', icon: <FileBadge className="h-3 w-3" />, className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  loan_document: { label: 'Loan Document', icon: <FileText className="h-3 w-3" />, className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  closing_statement: { label: 'Closing Statement', icon: <FileCheck className="h-3 w-3" />, className: 'bg-green-50 text-green-700 border-green-200' },
};

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let colorClass = 'text-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-200/50';
  if (pct < 70) colorClass = 'text-red-600 bg-red-50/70 ring-1 ring-red-200/50';
  else if (pct < 90) colorClass = 'text-amber-700 bg-amber-50/70 ring-1 ring-amber-200/50';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${colorClass}`}>
      {pct}%
    </span>
  );
}

function DocumentTypeBadge({ type }: { type: string | null }) {
  if (!type) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground bg-muted/50">
        <FileX className="h-3 w-3" />
        Unclassified
      </span>
    );
  }
  const config = docTypeConfig[type];
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground bg-muted/50">
        <FileText className="h-3 w-3" />
        {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export function DocumentList({ documents }: DocumentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/60 mb-4" />
        <h3 className="text-lg font-semibold tracking-tight">No documents uploaded yet</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
          Upload PDF documents to trigger AI extraction, checklist generation, and timeline events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {documents.map((doc) => {
        const status = statusConfig[doc.processing_status] ?? statusConfig.pending;
        const isExpanded = expandedId === doc.id;
        const hasMissingSigs = doc.missing_signatures && doc.missing_signatures.length > 0;
        const hasDetails = doc.extraction_results || hasMissingSigs || doc.has_addenda;

        return (
          <div key={doc.id} className="rounded-xl border overflow-hidden transition-shadow duration-200 hover:shadow-sm">
            <div
              className={`flex items-center justify-between px-5 py-4 ${hasDetails ? 'cursor-pointer hover:bg-muted/20 transition-colors duration-200' : ''}`}
              onClick={() => hasDetails && setExpandedId(isExpanded ? null : doc.id)}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {hasDetails && (
                  <span className="shrink-0 text-muted-foreground/70">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                )}
                <FileText className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    <DocumentTypeBadge type={doc.document_type} />
                    <span className="text-xs text-muted-foreground/70">
                      {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {doc.confidence_score != null && (
                      <ConfidenceBadge score={doc.confidence_score} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-4">
                {hasMissingSigs && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50/80 px-2.5 py-1 text-xs font-medium text-red-600">
                    <PenLine className="h-3 w-3" />
                    {doc.missing_signatures!.length} missing sig{doc.missing_signatures!.length > 1 ? 's' : ''}
                  </span>
                )}
                {doc.has_addenda && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50/80 px-2.5 py-1 text-xs font-medium text-purple-600">
                    <FileText className="h-3 w-3" />
                    {doc.addenda_count ?? '?'} addend{(doc.addenda_count ?? 0) === 1 ? 'um' : 'a'}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
            </div>

            {isExpanded && hasDetails && (
              <div className="border-t bg-muted/10 px-6 py-5 space-y-5">
                {doc.extraction_results && doc.extraction_results.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Extraction Results
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {doc.extraction_results.map((result, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-background border px-3.5 py-2.5 text-xs">
                          <span className="text-muted-foreground">{result.field}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium">{result.value}</span>
                            <ConfidenceBadge score={result.confidence} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasMissingSigs && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Missing Signatures
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {doc.missing_signatures!.map((sig, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-red-50/80 px-3 py-1.5 text-xs font-medium text-red-600">
                          <PenLine className="h-3 w-3" />
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {doc.has_addenda && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Addenda
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {doc.addenda_count ?? 'Unknown number of'} addend{(doc.addenda_count ?? 0) === 1 ? 'um' : 'a'} detected in this document.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
