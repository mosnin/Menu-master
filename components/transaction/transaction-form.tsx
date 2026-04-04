'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createTransactionAction } from '@/app/actions/transaction-actions';

export function TransactionForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      const result = await createTransactionAction(formData);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Transaction created', description: 'Your transaction has been created.' });
        router.push(`/transactions/${result.id}`);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create transaction.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <div className="space-y-8">
        {/* Transaction Details */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              Transaction Details
            </CardTitle>
            <CardDescription>Basic information about this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <Label htmlFor="title" className="text-sm font-medium">
                Transaction Title
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., 123 Main St Purchase"
                required
                className="h-10 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Used as the primary label throughout Deal Desk.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Property Address */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              Property Address
            </CardTitle>
            <CardDescription>Optional — can be extracted from documents later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="addressLine1" className="text-sm font-medium">
                Address Line 1
              </Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                placeholder="123 Main Street"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="addressLine2" className="text-sm font-medium">
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                placeholder="Suite 100"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2.5">
                <Label htmlFor="city" className="text-sm font-medium">City</Label>
                <Input id="city" name="city" placeholder="Denver" className="h-10 rounded-lg" />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="state" className="text-sm font-medium">State</Label>
                <Input id="state" name="state" placeholder="CO" maxLength={2} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="postalCode" className="text-sm font-medium">Zip Code</Label>
                <Input id="postalCode" name="postalCode" placeholder="80202" className="h-10 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              Parties
            </CardTitle>
            <CardDescription>Optional — can be extracted from documents later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buyer section */}
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Buyer
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label htmlFor="buyerName" className="text-sm font-medium">Name</Label>
                  <Input id="buyerName" name="buyerName" placeholder="John Smith" className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="buyerEmail" className="text-sm font-medium">Email</Label>
                  <Input id="buyerEmail" name="buyerEmail" type="email" placeholder="john@example.com" className="h-10 rounded-lg" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Seller section */}
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Seller
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label htmlFor="sellerName" className="text-sm font-medium">Name</Label>
                  <Input id="sellerName" name="sellerName" placeholder="Jane Doe" className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="sellerEmail" className="text-sm font-medium">Email</Label>
                  <Input id="sellerEmail" name="sellerEmail" type="email" placeholder="jane@example.com" className="h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl px-6"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-8 h-11 text-sm font-medium"
          >
            {isSubmitting ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </div>
    </form>
  );
}
