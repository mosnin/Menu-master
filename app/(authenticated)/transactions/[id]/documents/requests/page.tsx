import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileUp,
  Mail,
  Clock,
  CheckCircle2,
  Eye,
  XCircle,
  AlertCircle,
  Send,
} from 'lucide-react';
import { getDocumentRequestsAction } from '@/app/actions/document-request-actions';
import { cn } from '@/lib/utils';
import { CreateDocumentRequestForm } from './create-request-form';
import { CancelRequestButton } from './cancel-request-button';

interface DocumentRequestsPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof Send }
> = {
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800', icon: Send },
  viewed: { label: 'Viewed', className: 'bg-amber-100 text-amber-800', icon: Eye },
  uploaded: { label: 'Uploaded', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default async function DocumentRequestsPage({ params }: DocumentRequestsPageProps) {
  const { id: transactionId } = await params;

  const result = await getDocumentRequestsAction(transactionId);
  const requests: Array<Record<string, unknown>> =
    (result.data as unknown as Array<Record<string, unknown>>) ?? [];

  const activeRequests = requests.filter(
    (r) => r.status === 'sent' || r.status === 'viewed',
  );
  const completedRequests = requests.filter(
    (r) => r.status === 'uploaded' || r.status === 'expired' || r.status === 'cancelled',
  );

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="pt-2 pb-2">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-3">
          <FileUp className="h-5 w-5 text-muted-foreground" />
          Document Requests
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Request documents from external parties and track their progress.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Create Request Form - Sidebar */}
        <div className="lg:col-span-1 order-last lg:order-first">
          <Card className="rounded-2xl shadow-sm border-l-4 border-l-blue-400 border-blue-200/50">
            <CardHeader className="pb-3 p-7">
              <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <Mail className="h-4 w-4 text-blue-600" />
                New Request
              </CardTitle>
              <CardDescription className="mt-1.5">
                Request a document from a recipient
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-7 pt-0">
              <CreateDocumentRequestForm transactionId={transactionId} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Active Requests */}
          <section>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
              Active Requests
            </p>
            {activeRequests.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/40 mb-5">
                      <Mail className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      No active requests
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                      Create a document request to ask an external party for a specific document.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeRequests.map((req) => {
                  const status = statusConfig[(req.status as string) ?? 'sent'] ?? statusConfig.sent;
                  const StatusIcon = status.icon;
                  const reminderCount = (req.reminder_count as number) ?? (req.reminderCount as number) ?? 0;
                  const createdAt = (req.created_at as string) ?? (req.createdAt as string);

                  return (
                    <Card key={req.id as string} className="rounded-2xl shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 shrink-0 mt-0.5">
                              <StatusIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {(req.document_type as string) ?? (req.documentType as string) ?? 'Document'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {(req.recipient_name as string) ?? (req.recipientName as string) ?? ''}{' '}
                                ({(req.recipient_email as string) ?? (req.recipientEmail as string) ?? ''})
                              </p>
                              {(req.description as string) && (
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                  {req.description as string}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2.5">
                                <Badge className={cn('text-[10px] font-medium', status.className)}>
                                  {status.label}
                                </Badge>
                                {createdAt && (
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {new Date(createdAt).toLocaleDateString()}
                                  </span>
                                )}
                                {reminderCount > 0 && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} sent
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <CancelRequestButton requestId={req.id as string} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Completed / Closed Requests */}
          {completedRequests.length > 0 && (
            <section>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-4 px-1">
                Completed & Closed
              </p>
              <div className="space-y-3">
                {completedRequests.map((req) => {
                  const status =
                    statusConfig[(req.status as string) ?? 'cancelled'] ?? statusConfig.cancelled;
                  const StatusIcon = status.icon;
                  const createdAt = (req.created_at as string) ?? (req.createdAt as string);
                  const uploadedFileName =
                    (req.uploaded_file_name as string) ??
                    (req.uploadedFileName as string) ??
                    null;

                  return (
                    <Card
                      key={req.id as string}
                      className="rounded-2xl shadow-sm opacity-75"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40 shrink-0 mt-0.5">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {(req.document_type as string) ?? (req.documentType as string) ?? 'Document'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(req.recipient_name as string) ?? (req.recipientName as string) ?? ''}{' '}
                              ({(req.recipient_email as string) ?? (req.recipientEmail as string) ?? ''})
                            </p>
                            <div className="flex items-center gap-3 mt-2.5">
                              <Badge className={cn('text-[10px] font-medium', status.className)}>
                                {status.label}
                              </Badge>
                              {createdAt && (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {new Date(createdAt).toLocaleDateString()}
                                </span>
                              )}
                              {uploadedFileName && (
                                <span className="text-[11px] text-green-700 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {uploadedFileName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
