'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  ThumbsUp,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  User,
  ExternalLink,
} from 'lucide-react';

interface Communication {
  id: string;
  recipient: string;
  recipient_email: string;
  subject: string;
  body_preview: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  related_document_id?: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileEdit className="h-3 w-3" /> },
  pending_approval: { label: 'Pending Approval', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default', icon: <ThumbsUp className="h-3 w-3" /> },
  sent: { label: 'Sent', variant: 'success', icon: <Send className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

const approvalStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Awaiting Approval', className: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', className: 'text-green-700 bg-green-50 border-green-200' },
  rejected: { label: 'Rejected', className: 'text-red-700 bg-red-50 border-red-200' },
};

type FilterMode = 'all' | 'pending_approval' | 'sent' | 'failed';

function CommunicationsTable({ communications }: { communications: Communication[] }) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = communications.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const counts = {
    all: communications.length,
    pending_approval: communications.filter(c => c.status === 'pending_approval').length,
    sent: communications.filter(c => c.status === 'sent').length,
    failed: communications.filter(c => c.status === 'failed').length,
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {([
          ['all', 'All'],
          ['pending_approval', 'Needs Approval'],
          ['sent', 'Sent'],
          ['failed', 'Failed'],
        ] as [FilterMode, string][]).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'ghost'}
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter(key)}
          >
            {label}
            {counts[key] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                {counts[key]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Table header */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_140px_120px_100px] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>Recipient</span>
          <span>Subject</span>
          <span>Status</span>
          <span>Approval</span>
          <span>Date</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No messages match this filter</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((comm) => {
              const status = statusConfig[comm.status] ?? statusConfig.draft;
              const approval = comm.approval_status ? approvalStatusConfig[comm.approval_status] : null;
              const isExpanded = expandedId === comm.id;

              return (
                <div key={comm.id}>
                  <div
                    className="grid grid-cols-[1fr_1fr_140px_120px_100px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{comm.recipient}</p>
                        <p className="text-xs text-muted-foreground truncate">{comm.recipient_email}</p>
                      </div>
                    </div>
                    <p className="text-sm truncate">{comm.subject}</p>
                    <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                      {status.icon}
                      {status.label}
                    </Badge>
                    <div>
                      {approval ? (
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${approval.className}`}>
                          {approval.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(comm.sent_at ? new Date(comm.sent_at) : new Date(comm.created_at)).toLocaleDateString()}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2 border-t bg-muted/10">
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Preview</p>
                        <p className="text-sm text-muted-foreground bg-background rounded border p-3">
                          {comm.body_preview}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {comm.approved_by && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Approved by {comm.approved_by}
                            {comm.approved_at && ` on ${new Date(comm.approved_at).toLocaleDateString()}`}
                          </span>
                        )}
                        {comm.related_document_id && (
                          <a href="#" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <ExternalLink className="h-3 w-3" />
                            Related document
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const communications: Communication[] = []; // populated by data fetching

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Communications</h2>
          <p className="text-sm text-muted-foreground">
            Track outbound emails and messages for this transaction.
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          New Draft
        </Button>
      </div>

      {communications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <Mail className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No communications yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Email drafts will be generated from document processing and reminders.
            All emails require approval before sending.
          </p>
        </div>
      ) : (
        <CommunicationsTable communications={communications} />
      )}
    </div>
  );
}
