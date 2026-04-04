'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Home, ArrowRight, Calendar, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ListingStageBadge } from '@/components/listing/listing-stage-badge';
import { getListingsAction } from '@/app/actions/listing-actions';
import type { Listing, ListingStage } from '@/types';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <Card className="rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-px">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-semibold truncate tracking-tight text-base">{listing.title}</p>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
                <ListingStageBadge stage={listing.listing_stage} />
                {listing.list_price && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatCurrency(listing.list_price)}
                  </span>
                )}
                {listing.target_launch_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Launch: {listing.target_launch_date}
                  </span>
                )}
                {listing.seller_name && (
                  <span className="text-[12px]">Seller: {listing.seller_name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6 shrink-0">
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ListingsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: get orgId from session context
    // For now, listings load is handled by the action
    setLoading(false);
  }, []);

  const filteredListings = activeTab === 'all'
    ? listings
    : listings.filter(l => {
        if (activeTab === 'active') return ['preparing', 'ready_for_review', 'ready_to_launch', 'live'].includes(l.listing_stage);
        if (activeTab === 'under_contract') return l.listing_stage === 'under_contract';
        if (activeTab === 'closed') return ['closed', 'withdrawn', 'archived'].includes(l.listing_stage);
        return true;
      });

  return (
    <div className="space-y-10">
      <PageHeader
        title="Listings"
        description="Manage your property listings and seller workflows"
        actions={
          <Button asChild className="rounded-lg px-5 py-2.5">
            <Link href="/listings/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="p-1">
          <TabsTrigger value="all" className="px-6 py-2.5 text-sm">All</TabsTrigger>
          <TabsTrigger value="active" className="px-6 py-2.5 text-sm">Active</TabsTrigger>
          <TabsTrigger value="under_contract" className="px-6 py-2.5 text-sm">Under Contract</TabsTrigger>
          <TabsTrigger value="closed" className="px-6 py-2.5 text-sm">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-8">
          {filteredListings.length === 0 ? (
            <EmptyState
              icon={Home}
              title="No listings yet"
              description="Create your first listing to start managing seller workflows and property launches."
              action={
                <Button asChild className="rounded-lg px-5 py-2.5">
                  <Link href="/listings/new" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Listing
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
