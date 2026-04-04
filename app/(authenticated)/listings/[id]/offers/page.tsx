'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { OfferComparisonTable } from '@/components/listing/offer-comparison-table';
import { getListingAction } from '@/app/actions/listing-actions';
import { getOffersByListingAction, createOfferAction } from '@/app/actions/offer-actions';
import type { Listing, Offer } from '@/types';
import { ArrowLeft, Plus } from 'lucide-react';

export default function ListingOffersPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [l, o] = await Promise.all([
        getListingAction(listingId),
        getOffersByListingAction(listingId),
      ]);
      setListing(l);
      setOffers(o);
      setLoading(false);
    }
    load();
  }, [listingId]);

  async function handleCreateOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const result = await createOfferAction(listingId, {
      buyerName: fd.get('buyerName') as string,
      buyerEmail: fd.get('buyerEmail') as string || undefined,
      buyerAgentName: fd.get('buyerAgentName') as string || undefined,
      buyerAgentEmail: fd.get('buyerAgentEmail') as string || undefined,
      offerAmount: Number(fd.get('offerAmount')),
      earnestMoney: fd.get('earnestMoney') ? Number(fd.get('earnestMoney')) : undefined,
      financingType: (fd.get('financingType') as any) || 'conventional',
      closingTimelineDays: fd.get('closingTimelineDays') ? Number(fd.get('closingTimelineDays')) : undefined,
      concessionsAmount: fd.get('concessionsAmount') ? Number(fd.get('concessionsAmount')) : undefined,
      expirationDate: fd.get('expirationDate') as string || undefined,
    });
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
    } else {
      setShowForm(false);
      // Reload offers
      const o = await getOffersByListingAction(listingId);
      setOffers(o);
    }
  }

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 w-48 bg-muted rounded mb-6" /><div className="h-64 bg-muted rounded-2xl" /></div>;
  }

  if (!listing) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Listing not found</p></div>;
  }

  const canAddOffers = ['live', 'paused'].includes(listing.listing_stage);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href={`/listings/${listingId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader
          title={`Offers — ${listing.title}`}
          description={`${offers.length} offer${offers.length !== 1 ? 's' : ''} received`}
          actions={
            canAddOffers ? (
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Record Offer
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* New Offer Form */}
      {showForm && (
        <Card className="rounded-2xl">
          <CardContent className="p-7">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-5">
              New Offer
            </div>
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px]">Buyer Name *</Label>
                  <Input name="buyerName" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Buyer Email</Label>
                  <Input name="buyerEmail" type="email" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Buyer Agent</Label>
                  <Input name="buyerAgentName" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Agent Email</Label>
                  <Input name="buyerAgentEmail" type="email" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[13px]">Offer Amount *</Label>
                  <Input name="offerAmount" type="number" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Earnest Money</Label>
                  <Input name="earnestMoney" type="number" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Financing</Label>
                  <select name="financingType" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="conventional">Conventional</option>
                    <option value="fha">FHA</option>
                    <option value="va">VA</option>
                    <option value="cash">Cash</option>
                    <option value="usda">USDA</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[13px]">Closing Timeline (days)</Label>
                  <Input name="closingTimelineDays" type="number" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Concessions</Label>
                  <Input name="concessionsAmount" type="number" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Expiration Date</Label>
                  <Input name="expirationDate" type="date" className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Offer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <OfferComparisonTable offers={offers} listPrice={listing.list_price} />
    </div>
  );
}
