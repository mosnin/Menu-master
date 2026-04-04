'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadDocumentAction } from '@/app/actions/document-actions';

interface DocumentUploadProps {
  transactionId: string;
  organizationId?: string;
}

export function DocumentUpload({ transactionId, organizationId }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast({ title: 'Invalid file', description: `${file.name} is not a PDF.`, variant: 'destructive' });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('transactionId', transactionId);
        if (organizationId) formData.append('organizationId', organizationId);

        const result = await uploadDocumentAction(formData);
        if (result.error) {
          toast({ title: 'Upload failed', description: result.error, variant: 'destructive' });
        } else {
          toast({ title: 'Document uploaded', description: `${file.name} uploaded and queued for processing.` });
        }
      }
    } catch {
      toast({ title: 'Upload failed', description: 'An error occurred during upload.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
    >
      <CardContent className="flex flex-col items-center justify-center py-10">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
            <p className="text-sm font-medium">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">Drop PDF files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF files only, up to 10MB each</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
