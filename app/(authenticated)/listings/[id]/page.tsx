'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { ListingPipeline } from '@/components/listing/listing-pipeline';
import { ListingStageBadge } from '@/components/listing/listing-stage-badge';
import { ListingReadinessCard } from '@/components/listing/listing-readiness-card';
import { ListingChecklistPanel } from '@/components/listing/listing-checklist-panel';
import {
  getListingAction,
  getListingChecklistAction,
  getAvailableListingStagesAction,
  transitionListingStageAction,
} from '@/app/actions/listing-actions';
import type { Listing, ListingChecklistItem, ListingStage } from '@/types';
import { Home, DollarSign, Calendar, User, FileText, Gavel, Users, ArrowRight } from 'lucide-react';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [checklist, setChecklist] = useState<ListingChecklistItem[]>([]);
  const [availableStages, setAvailableStages] = useState<ListingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [l, cl] = await Promise.all([
        getListingAction(listingId),
        getListingChecklistAction(listingId),
      ]);
      setListing(l);
      setChecklist(cl);
      if (l) {
        const stages = await getAvailableListingStagesAction(l.listing_stage);
        setAvailableStages(stages);
      }
      setLoading(false);
    }
    load();
  }, [listingId]);

  async function handleStageTransition(toStage: ListingStage) {
    setStageLoading(true);
    const result = await transitionListingStageAction(listingId, toStage);
    if (result.error) {
      alert(result.error);
    } else {
      // Reload
      const l = await getListingAction(listingId);
      setListing(l);
      if (l) {
        const stages = await getAvailableListingStagesAction(l.listing_stage);
        setAvailableStages(stages);
      }
    }
    setStageLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Listing not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={listing.title}
        description={listing.listing_description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/listings/${listingId}/offers`}>
                <Gavel className="h-4 w-4 mr-1.5" />
                Offers
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/listings/${listingId}/seller`}>
                <Users className="h-4 w-4 mr-1.5" />
                Seller Portal
              </Link>
            </Button>
          </div>
        }
      />

      {/* Pipeline */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <ListingPipeline currentStage={listing.listing_stage} />
        </CardContent>
      </Card>

      {/* Handoff banner */}
      {listing.converted_transaction_id && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-indigo-900">Under Contract</div>
            <div className="text-[13px] text-indigo-700/70 mt-0.5">
              This listing has been converted to an active transaction.
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
            <Link href={`/transactions/${listing.converted_transaction_id}/overview`}>
              View Transaction <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info card */}
          <Card className="rounded-2xl">
            <CardContent className="p-7">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-5">
                Listing Details
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">List Price</div>
                    <div className="text-lg font-semibold">{formatCurrency(listing.list_price)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">Type</div>
                    <div className="text-sm capitalize">{listing.listing_type.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">MLS Number</div>
                    <div className="text-sm">{listing.mls_number ?? '—'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">Seller</div>
                    <div className="text-sm font-medium">{listing.seller_name ?? '—'}</div>
                    {listing.seller_email && (
                      <div className="text-[12px] text-muted-foreground/60">{listing.seller_email}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">Target Launch</div>
                    <div className="text-sm">{listing.target_launch_date ?? '—'}</div>
                  </div>
                  {listing.actual_launch_date && (
                    <div>
                      <div className="text-[11px] text-muted-foreground/50 mb-1">Launched</div>
                      <div className="text-sm">{listing.actual_launch_date}</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <ListingChecklistPanel items={checklist} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Readiness */}
          <ListingReadinessCard listingId={listingId} />

          {/* Stage transition */}
          <Card className="rounded-2xl">
            <CardContent className="p-7">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
                Stage Actions
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[13px] text-muted-foreground">Current:</span>
                <ListingStageBadge stage={listing.listing_stage} />
              </div>
              {availableStages.length > 0 ? (
                <div className="space-y-2">
                  {availableStages.map(stage => (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-[13px]"
                      disabled={stageLoading}
                      onClick={() => handleStageTransition(stage)}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-2" />
                      Move to {stage.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground/60">No transitions available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
