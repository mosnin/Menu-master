'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDocumentRequestAction } from '@/app/actions/document-request-actions';
import { Loader2, Send } from 'lucide-react';

interface CreateDocumentRequestFormProps {
  transactionId: string;
}

const documentTypes = [
  { value: 'purchase_agreement', label: 'Purchase Agreement' },
  { value: 'seller_disclosures', label: 'Seller Disclosures' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'title_report', label: 'Title Report' },
  { value: 'loan_estimate', label: 'Loan Estimate' },
  { value: 'closing_disclosure', label: 'Closing Disclosure' },
  { value: 'proof_of_funds', label: 'Proof of Funds' },
  { value: 'insurance_binder', label: 'Insurance Binder' },
  { value: 'hoa_documents', label: 'HOA Documents' },
  { value: 'other', label: 'Other' },
];

export function CreateDocumentRequestForm({ transactionId }: CreateDocumentRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!recipientEmail || !recipientName || !documentType) {
      setError('Please fill in all required fields.');
      return;
    }

    startTransition(async () => {
      const result = await createDocumentRequestAction(
        transactionId,
        recipientEmail,
        recipientName,
        documentType,
        description || undefined,
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setRecipientEmail('');
        setRecipientName('');
        setDocumentType('');
        setDescription('');
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="req-email" className="text-xs font-medium">
          Recipient Email
        </Label>
        <Input
          id="req-email"
          type="email"
          placeholder="name@company.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="rounded-lg"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="req-name" className="text-xs font-medium">
          Recipient Name
        </Label>
        <Input
          id="req-name"
          type="text"
          placeholder="Jane Smith"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          className="rounded-lg"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="req-doc-type" className="text-xs font-medium">
          Document Type
        </Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="rounded-lg">
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="req-description" className="text-xs font-medium">
          Description (optional)
        </Label>
        <Textarea
          id="req-description"
          placeholder="Any additional details about what you need..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg resize-none"
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 leading-relaxed">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 leading-relaxed">
          Request sent successfully.
        </p>
      )}

      <Button
        type="submit"
        className="w-full rounded-lg"
        size="sm"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Send Request
      </Button>
    </form>
  );
}
