import { DocumentUpload } from '@/components/document/document-upload';
import { DocumentList } from '@/components/document/document-list';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ProcessingSummary({ documents }: { documents: any[] }) {
  const total = documents.length;
  const extracted = documents.filter(d => d.processing_status === 'completed').length;
  const processing = documents.filter(d => d.processing_status === 'processing').length;
  const issues = documents.filter(d => ['failed', 'ocr_required', 'manual_review'].includes(d.processing_status)).length;

  if (total === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="rounded-xl">
        <CardContent className="flex items-center gap-3.5 py-4 px-5">
          <div className="rounded-full bg-blue-50/70 p-2.5">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">{total}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Total</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardContent className="flex items-center gap-3.5 py-4 px-5">
          <div className="rounded-full bg-emerald-50/70 p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">{extracted}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Extracted</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardContent className="flex items-center gap-3.5 py-4 px-5">
          <div className="rounded-full bg-blue-50/70 p-2.5">
            <Loader2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">{processing}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Processing</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardContent className="flex items-center gap-3.5 py-4 px-5">
          <div className="rounded-full bg-red-50/70 p-2.5">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">{issues}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Issues</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const documents: any[] = []; // populated by data fetching

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Upload transaction PDFs for automated extraction and processing.
        </p>
      </div>

      <ProcessingSummary documents={documents} />

      <div className="rounded-xl border border-dashed bg-card p-6">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-4">Upload Documents</h3>
        <DocumentUpload transactionId={id} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-4">Uploaded Documents</h3>
        <DocumentList documents={documents} />
      </div>
    </div>
  );
}
