import { DocumentUpload } from '@/components/document/document-upload';
import { DocumentList } from '@/components/document/document-list';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Upload transaction PDFs for automated extraction and processing.
        </p>
      </div>

      <DocumentUpload transactionId={id} />

      <div>
        <h3 className="text-sm font-medium mb-3">Uploaded Documents</h3>
        <DocumentList documents={[]} />
      </div>
    </div>
  );
}
