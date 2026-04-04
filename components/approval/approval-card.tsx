'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, Eye, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decideApprovalAction } from '@/app/actions/approval-actions';

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
  };
}

const typeLabels: Record<string, string> = {
  outbound_email: 'Outbound Email',
  extraction_review: 'Extraction Review',
  checklist_review: 'Checklist Review',
};

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive'; icon: React.ReactNode }> = {
  pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  approved: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
};

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const config = statusConfig[approval.status] ?? statusConfig.pending;
  const payload = approval.payload_json as Record<string, string> | null;

  async function handleDecision(decision: 'approved' | 'rejected') {
    setIsSubmitting(true);
    try {
      const result = await decideApprovalAction(approval.id, decision, notes || undefined);
      if (result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: decision === 'approved' ? 'Approved' : 'Rejected', description: `Approval has been ${decision}.` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process approval.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            {typeLabels[approval.approval_type] ?? approval.approval_type}
          </CardTitle>
          <Badge variant={config.variant} className="flex items-center gap-1">
            {config.icon}
            {approval.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Preview payload */}
        {payload && approval.approval_type === 'outbound_email' && (
          <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
            {payload.recipient_email && (
              <div><span className="font-medium">To:</span> {payload.recipient_name} &lt;{payload.recipient_email}&gt;</div>
            )}
            {payload.subject && (
              <div><span className="font-medium">Subject:</span> {payload.subject}</div>
            )}
            {payload.body && (
              <div className="mt-2 whitespace-pre-wrap text-xs border-t pt-2">{payload.body}</div>
            )}
          </div>
        )}

        {payload && approval.approval_type !== 'outbound_email' && (
          <div className="rounded-md bg-muted p-3 text-xs">
            <pre className="whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Created {new Date(approval.created_at).toLocaleString()}
          {approval.decided_at && (
            <> &middot; Decided {new Date(approval.decided_at).toLocaleString()}</>
          )}
        </div>

        {approval.decision_notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Notes:</span> {approval.decision_notes}
          </div>
        )}

        {showNotes && approval.status === 'pending' && (
          <Textarea
            placeholder="Add decision notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm"
          />
        )}
      </CardContent>

      {approval.status === 'pending' && (
        <CardFooter className="gap-2">
          {!showNotes && (
            <Button variant="ghost" size="sm" onClick={() => setShowNotes(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Add Notes
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDecision('rejected')}
            disabled={isSubmitting}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => handleDecision('approved')}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
