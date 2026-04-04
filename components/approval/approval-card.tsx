'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Bot,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  FileSearch,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decideApprovalAction } from '@/app/actions/approval-actions';
import Link from 'next/link';

interface ApprovalCardProps {
  approval: {
    id: string;
    approval_type: string;
    status: string;
    payload_json: Record<string, unknown> | null;
    decision_notes: string | null;
    created_at: string;
    decided_at: string | null;
    transaction_id: string;
    requested_by_user_id?: string;
  };
  transactionTitle?: string;
}

const typeLabels: Record<string, string> = {
  outbound_email: 'Outbound Email',
  extraction_review: 'Extraction Review',
  checklist_review: 'Checklist Review',
};

const typeIcons: Record<string, React.ReactNode> = {
  outbound_email: <MessageSquare className="h-4 w-4" />,
  extraction_review: <FileSearch className="h-4 w-4" />,
  checklist_review: <ClipboardCheck className="h-4 w-4" />,
};

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning'; icon: React.ReactNode; label: string }> = {
  pending: { variant: 'warning', icon: <Clock className="h-3 w-3" />, label: 'Pending Review' },
  approved: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Approved' },
  rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' },
  cancelled: { variant: 'secondary', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getConfidenceLabel(payload: Record<string, unknown> | null): { level: string; variant: 'success' | 'warning' | 'destructive' } | null {
  if (!payload) return null;
  const confidence = payload.confidence_score ?? payload.confidence;
  if (typeof confidence !== 'number') return null;

  if (confidence >= 0.9) return { level: 'High confidence', variant: 'success' };
  if (confidence >= 0.7) return { level: 'Medium confidence', variant: 'warning' };
  return { level: 'Low confidence', variant: 'destructive' };
}

export function ApprovalCard({ approval, transactionTitle }: ApprovalCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const config = statusConfig[approval.status] ?? statusConfig.pending;
  const payload = approval.payload_json as Record<string, string> | null;
  const confidenceInfo = getConfidenceLabel(approval.payload_json);
  const typeIcon = typeIcons[approval.approval_type] ?? <Bot className="h-4 w-4" />;

  async function handleDecision(decision: 'approved' | 'rejected') {
    setIsSubmitting(true);
    try {
      const result = await decideApprovalAction(approval.id, decision, notes || undefined);
      if (result?.error) {
        toast({
          title: 'Approval failed',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        const typeLabel = typeLabels[approval.approval_type] ?? 'Item';
        toast({
          title: decision === 'approved' ? 'Approved successfully' : 'Rejected',
          description: decision === 'approved'
            ? `${typeLabel} has been approved and will be processed.`
            : `${typeLabel} has been rejected.${notes ? ' Your notes have been saved.' : ''}`,
        });
      }
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Failed to process this approval. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className={`rounded-2xl transition-shadow duration-300 ${approval.status === 'pending' ? 'border-l-4 border-l-amber-400 border-amber-200/50 shadow-sm hover:shadow-md' : 'shadow-sm'}`}>
      <CardHeader className="p-7 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              {typeIcon}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2.5 flex-wrap">
                {typeLabels[approval.approval_type] ?? approval.approval_type}
                <Badge variant="secondary" className="text-xs gap-1.5 bg-violet-100/80 text-violet-700 border-violet-200/50">
                  <Bot className="h-3 w-3" />
                  AI Generated
                </Badge>
                {approval.status === 'approved' && (
                  <Badge variant="success" className="text-xs gap-1.5 bg-emerald-100/80 text-emerald-700 border-emerald-200/50">
                    <ShieldCheck className="h-3 w-3" />
                    Human Approved
                  </Badge>
                )}
                {confidenceInfo && (
                  <Badge variant={confidenceInfo.variant} className="text-xs gap-1.5">
                    {confidenceInfo.variant === 'destructive' && <AlertTriangle className="h-3 w-3" />}
                    {confidenceInfo.variant === 'success' && <Sparkles className="h-3 w-3" />}
                    {confidenceInfo.level}
                  </Badge>
                )}
              </CardTitle>
              {transactionTitle && (
                <Link
                  href={`/transactions/${approval.transaction_id}`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1.5 mt-1.5"
                >
                  {transactionTitle}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {getRelativeTime(approval.created_at)}
            </span>
            <Badge variant={config.variant} className="flex items-center gap-1.5 px-2.5 py-1">
              {config.icon}
              {config.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-7 pt-5 space-y-5">
        {/* Email payload preview */}
        {payload && approval.approval_type === 'outbound_email' && (
          <div className="rounded-xl border bg-muted/30 p-5 space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              <MessageSquare className="h-3 w-3" />
              Email Preview
            </div>
            {(payload.recipient_email || payload.recipient) && (
              <div><span className="font-medium text-muted-foreground">To:</span> {payload.recipient_name && `${payload.recipient_name} `}&lt;{payload.recipient_email || payload.recipient}&gt;</div>
            )}
            {payload.subject && (
              <div><span className="font-medium text-muted-foreground">Subject:</span> {payload.subject}</div>
            )}
            {payload.body && (
              <div className="mt-4 whitespace-pre-wrap text-xs border-t pt-4 text-muted-foreground leading-relaxed">{payload.body}</div>
            )}
          </div>
        )}

        {/* Generic payload preview */}
        {payload && approval.approval_type !== 'outbound_email' && (
          <div className="rounded-xl border bg-muted/30 p-5 text-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              <FileSearch className="h-3 w-3" />
              Payload
            </div>
            <pre className="whitespace-pre-wrap font-mono text-muted-foreground">{JSON.stringify(payload, null, 2)}</pre>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Created {getRelativeTime(approval.created_at)}
          </span>
          {approval.decided_at && (
            <>
              <span>&middot;</span>
              <span className="flex items-center gap-1.5">
                {approval.status === 'approved' ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-600" />}
                Decided {getRelativeTime(approval.decided_at)}
              </span>
            </>
          )}
        </div>

        {/* Decision notes */}
        {approval.decision_notes && (
          <div className="rounded-xl bg-muted/30 border p-4 text-sm">
            <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Decision Notes</span>
            <p className="mt-1.5 text-sm leading-relaxed">{approval.decision_notes}</p>
          </div>
        )}

        {/* Add notes textarea */}
        {showNotes && approval.status === 'pending' && (
          <Textarea
            placeholder="Add decision notes (optional) - explain your reasoning for the audit trail"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm rounded-xl"
            rows={3}
          />
        )}
      </CardContent>

      {approval.status === 'pending' && (
        <CardFooter className="p-7 pt-0 gap-3">
          {!showNotes && (
            <Button variant="ghost" size="sm" onClick={() => setShowNotes(true)} className="rounded-lg">
              <Eye className="h-4 w-4 mr-1.5" />
              Add Notes
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDecision('rejected')}
            disabled={isSubmitting}
            className="rounded-lg px-5 py-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors duration-200"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => handleDecision('approved')}
            disabled={isSubmitting}
            className="rounded-lg px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
