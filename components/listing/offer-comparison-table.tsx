'use client';

import type { Offer } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateOfferStatusAction, acceptOfferAndHandoffAction } from '@/app/actions/offer-actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

const statusColors: Record<string, string> = {
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  countered: 'bg-purple-50 text-purple-700 border-purple-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-500 border-gray-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function OfferComparisonTable({ offers, listPrice }: { offers: Offer[]; listPrice?: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAccept(offerId: string) {
    if (!confirm('Accept this offer and create an under-contract transaction? This cannot be undone.')) return;
    setLoading(offerId);
    const result = await acceptOfferAndHandoffAction(offerId);
    setLoading(null);
    if (result.error) {
      alert(result.error);
    } else if (result.transactionId) {
      router.push(`/transactions/${result.transactionId}/overview`);
    }
  }

  async function handleStatusChange(offerId: string, status: 'under_review' | 'rejected') {
    setLoading(offerId);
    const result = await updateOfferStatusAction(offerId, status);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center">
        <p className="text-muted-foreground text-sm">No offers received yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Buyer</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Amount</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Financing</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Earnest</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Timeline</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Concessions</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Contingencies</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Status</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, i) => {
              const pctOfList = listPrice && listPrice > 0
                ? ((offer.offer_amount / listPrice) * 100).toFixed(1)
                : null;
              const isActive = ['received', 'under_review', 'countered'].includes(offer.status);

              return (
                <tr key={offer.id} className={cn('border-b last:border-0', i % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                  <td className="px-5 py-4">
                    <div className="font-medium">{offer.buyer_name}</div>
                    {offer.buyer_agent_name && (
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5">Agent: {offer.buyer_agent_name}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-semibold">{formatCurrency(offer.offer_amount)}</div>
                    {pctOfList && (
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5">{pctOfList}% of list</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="capitalize">{offer.financing_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-4 text-right">{formatCurrency(offer.earnest_money)}</td>
                  <td className="px-5 py-4 text-center">
                    {offer.closing_timeline_days ? `${offer.closing_timeline_days} days` : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">{formatCurrency(offer.concessions_amount)}</td>
                  <td className="px-5 py-4 text-center">
                    {offer.contingencies.length > 0 ? (
                      <span className="text-[11px]">{offer.contingencies.length} item{offer.contingencies.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-muted-foreground/40">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Badge variant="outline" className={cn('text-[10px] border', statusColors[offer.status])}>
                      {offer.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {isActive && (
                      <div className="flex items-center justify-end gap-1.5">
                        {offer.status === 'received' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={loading === offer.id}
                            onClick={() => handleStatusChange(offer.id, 'under_review')}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-red-600 hover:text-red-700"
                          disabled={loading === offer.id}
                          onClick={() => handleStatusChange(offer.id, 'rejected')}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={loading === offer.id}
                          onClick={() => handleAccept(offer.id)}
                        >
                          {loading === offer.id ? 'Processing...' : 'Accept'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
