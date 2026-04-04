import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface DocumentItem {
  id: string;
  file_name: string;
  document_type: string | null;
  processing_status: string;
  created_at: string;
}

interface DocumentListProps {
  documents: DocumentItem[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  completed: { label: 'Extracted', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  ocr_required: { label: 'OCR Required', variant: 'warning' },
  manual_review: { label: 'Manual Review', variant: 'warning' },
};

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const status = statusConfig[doc.processing_status] ?? statusConfig.pending;
        return (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.document_type ?? 'Unclassified'} &middot;{' '}
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}
