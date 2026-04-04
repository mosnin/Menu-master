'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { createListingAction } from '@/app/actions/listing-actions';

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createListingAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.id) {
      router.push(`/listings/${result.id}`);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="New Listing"
        description="Create a new property listing to begin the seller workflow"
      />

      <Card className="rounded-2xl max-w-2xl">
        <CardContent className="p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
                {error}
              </div>
            )}

            {/* Listing Info */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Listing Details
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title" className="text-[13px]">Listing Title</Label>
                  <Input id="title" name="title" required placeholder="e.g. 123 Oak Street" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="listingType" className="text-[13px]">Type</Label>
                    <select id="listingType" name="listingType" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="land">Land</option>
                      <option value="multi_family">Multi-Family</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="listPrice" className="text-[13px]">List Price</Label>
                    <Input id="listPrice" name="listPrice" type="number" placeholder="450000" className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="targetLaunchDate" className="text-[13px]">Target Launch Date</Label>
                  <Input id="targetLaunchDate" name="targetLaunchDate" type="date" className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Property Address */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Property Address
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="propertyAddress" className="text-[13px]">Street Address</Label>
                  <Input id="propertyAddress" name="propertyAddress" placeholder="123 Oak Street" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="propertyCity" className="text-[13px]">City</Label>
                    <Input id="propertyCity" name="propertyCity" placeholder="Austin" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="propertyState" className="text-[13px]">State</Label>
                    <Input id="propertyState" name="propertyState" placeholder="TX" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="propertyPostalCode" className="text-[13px]">Zip</Label>
                    <Input id="propertyPostalCode" name="propertyPostalCode" placeholder="78701" className="mt-1.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Seller Information
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sellerName" className="text-[13px]">Seller Name</Label>
                  <Input id="sellerName" name="sellerName" placeholder="John Smith" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sellerEmail" className="text-[13px]">Email</Label>
                    <Input id="sellerEmail" name="sellerEmail" type="email" placeholder="john@example.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="sellerPhone" className="text-[13px]">Phone</Label>
                    <Input id="sellerPhone" name="sellerPhone" type="tel" placeholder="(512) 555-1234" className="mt-1.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/listings')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Listing'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
