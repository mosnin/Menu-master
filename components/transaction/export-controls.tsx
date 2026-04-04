'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  FileJson,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ExportSection,
  type ExportJob,
  type ExportStatus,
  requestExportAction,
  getExportJobsAction,
} from '@/app/actions/export-actions';

const EXPORT_SECTIONS: { key: ExportSection; label: string; description: string }[] = [
  { key: 'summary', label: 'Summary', description: 'Transaction overview and key details' },
  { key: 'timeline', label: 'Timeline', description: 'Full event history and audit trail' },
  { key: 'approvals', label: 'Approvals', description: 'Approval requests and decisions' },
  { key: 'documents', label: 'Documents', description: 'Document metadata and extraction data' },
  { key: 'corrections', label: 'Corrections', description: 'Field corrections and amendments' },
  { key: 'exceptions', label: 'Exceptions', description: 'Flagged issues and resolutions' },
  { key: 'closing_readiness', label: 'Closing Readiness', description: 'Readiness scores and checklist status' },
];

const STATUS_CONFIG: Record<ExportStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Failed' },
};

interface ExportControlsProps {
  transactionId: string;
}

export function ExportControls({ transactionId }: ExportControlsProps) {
  const [selectedSections, setSelectedSections] = useState<Set<ExportSection>>(
    new Set(['summary', 'timeline', 'approvals', 'documents']),
  );
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchJobs() {
      const result = await getExportJobsAction(transactionId);
      if (result.data) setJobs(result.data);
    }
    fetchJobs();
  }, [transactionId]);

  function toggleSection(section: ExportSection) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedSections(new Set(EXPORT_SECTIONS.map((s) => s.key)));
  }

  function handleExport() {
    if (selectedSections.size === 0) return;

    startTransition(async () => {
      const result = await requestExportAction(
        transactionId,
        Array.from(selectedSections),
        'json',
      );
      if (result.data) {
        setJobs((prev) => [result.data!, ...prev]);
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Package className="h-4 w-4 text-muted-foreground" />
            Export Audit Pack
          </CardTitle>
          <CardDescription>
            Generate a comprehensive audit export of this transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Section Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sections to include
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline transition-colors duration-150"
              >
                Select all
              </button>
            </div>
            <div className="space-y-1">
              {EXPORT_SECTIONS.map((section) => {
                const isSelected = selectedSections.has(section.key);
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150',
                      isSelected
                        ? 'bg-primary/[0.05] border border-primary/20'
                        : 'border border-transparent hover:bg-muted/30',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{section.label}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Format */}
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Format
            </span>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5">
                <FileJson className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">JSON</p>
                  <p className="text-xs text-muted-foreground">Structured data format</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isPending || selectedSections.size === 0}
            className="w-full rounded-lg h-10"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Audit Pack
                {selectedSections.size > 0 && (
                  <Badge variant="secondary" className="ml-2 rounded-md px-1.5 py-0 text-[10px]">
                    {selectedSections.size} section{selectedSections.size !== 1 ? 's' : ''}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Export Jobs */}
      {jobs.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.map((job, i) => {
                const statusConfig = STATUS_CONFIG[job.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={job.id}>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', statusConfig.bgColor)}>
                          <StatusIcon
                            className={cn(
                              'h-4 w-4',
                              statusConfig.color,
                              job.status === 'processing' && 'animate-spin',
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {job.sections.length} section{job.sections.length !== 1 ? 's' : ''} ({job.format.toUpperCase()})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(job.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-medium',
                            statusConfig.bgColor,
                            statusConfig.color,
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                        {job.status === 'completed' && job.download_url && (
                          <a
                            href={job.download_url}
                            download
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                    {job.status === 'failed' && job.error_message && (
                      <p className="text-xs text-red-600 mt-1 ml-11">
                        {job.error_message}
                      </p>
                    )}
                    {i < jobs.length - 1 && <Separator className="mt-3" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
