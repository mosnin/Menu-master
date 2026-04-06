'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSellerProgressAction } from '@/app/actions/seller-portal-actions';
import { CheckCircle2, Clock, FileUp, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerProgress {
  listingTitle: string;
  stage: string;
  stageLabel: string;
  listPrice: number | null;
  targetLaunchDate: string | null;
  documentsRequested: number;
  documentsPending: number;
  documentsUploaded: number;
  pendingDocuments: Array<{
    id: string;
    documentType: string;
    description: string | null;
    dueDate: string | null;
  }>;
  canUpload: boolean;
  showOffersSummary: boolean;
}

export default function SellerPortalPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [progress, setProgress] = useState<SellerProgress | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }
    getSellerProgressAction(token).then(result => {
      if (result) {
        setProgress(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 w-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="rounded-2xl max-w-md w-full">
          <CardContent className="p-10 text-center">
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Home className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Access Unavailable</h2>
            <p className="text-[13px] text-muted-foreground">
              This link is no longer valid. Please contact your agent for an updated link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center">
              <Home className="h-4.5 w-4.5 text-background" />
            </div>
            <span className="text-[13px] font-semibold">Chippi</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-4">{progress.listingTitle}</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">Your listing progress</p>
        </div>

        {/* Status */}
        <Card className="rounded-2xl mb-6">
          <CardContent className="p-7">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
              Current Status
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-sm px-3 py-1">
                {progress.stageLabel}
              </Badge>
            </div>
            {progress.listPrice && (
              <div className="mt-4 text-2xl font-semibold tracking-tight">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(progress.listPrice)}
              </div>
            )}
            {progress.targetLaunchDate && (
              <div className="mt-2 text-[13px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Target launch: {progress.targetLaunchDate}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="rounded-2xl mb-6">
          <CardContent className="p-7">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
              Documents
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="p-3 rounded-xl bg-muted/30 text-center">
                <div className="text-xl font-semibold">{progress.documentsRequested}</div>
                <div className="text-[11px] text-muted-foreground/60">Requested</div>
              </div>
              <div className="p-3 rounded-xl bg-green-50 text-center">
                <div className="text-xl font-semibold text-green-700">{progress.documentsUploaded}</div>
                <div className="text-[11px] text-green-600/70">Uploaded</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-center">
                <div className="text-xl font-semibold text-amber-700">{progress.documentsPending}</div>
                <div className="text-[11px] text-amber-600/70">Pending</div>
              </div>
            </div>

            {progress.pendingDocuments.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
                  Action Needed
                </div>
                {progress.pendingDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 border-amber-200/50">
                    <div>
                      <div className="text-[13px] font-medium">{doc.documentType}</div>
                      {doc.description && (
                        <div className="text-[11px] text-muted-foreground/60 mt-0.5">{doc.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.dueDate && (
                        <span className="text-[11px] text-amber-600">Due: {doc.dueDate}</span>
                      )}
                      {progress.canUpload && (
                        <div className="h-7 w-7 rounded-md bg-amber-100 flex items-center justify-center">
                          <FileUp className="h-3.5 w-3.5 text-amber-700" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {progress.pendingDocuments.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200/50">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-[13px] text-green-700">All requested documents have been submitted</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-[11px] text-muted-foreground/40">
            Powered by Chippi
          </p>
        </div>
      </div>
    </div>
  );
}
