'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { generateDigestPreviewAction } from '@/app/actions/digest-actions';

export function DigestPreviewButton() {
  const [isPending, startTransition] = useTransition();
  const [previewGenerated, setPreviewGenerated] = useState(false);

  function handlePreview() {
    startTransition(async () => {
      const result = await generateDigestPreviewAction();
      if (result.data) {
        setPreviewGenerated(true);
        setTimeout(() => setPreviewGenerated(false), 3000);
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handlePreview}
      disabled={isPending}
      className="rounded-xl px-5 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : previewGenerated ? (
        'Preview Generated'
      ) : (
        <>
          <Eye className="h-4 w-4 mr-2" />
          Preview Tomorrow&apos;s Digest
        </>
      )}
    </Button>
  );
}
