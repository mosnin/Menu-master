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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <div className="rounded-full bg-blue-50 p-2">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <div className="rounded-full bg-green-50 p-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{extracted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Extracted</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <div className="rounded-full bg-blue-50 p-2">
            <Loader2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{processing}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Processing</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <div className="rounded-full bg-red-50 p-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{issues}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Issues</p>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Upload transaction PDFs for automated extraction and processing.
        </p>
      </div>

      <ProcessingSummary documents={documents} />

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">Upload Documents</h3>
        <DocumentUpload transactionId={id} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">Uploaded Documents</h3>
        <DocumentList documents={documents} />
      </div>
    </div>
  );
}
