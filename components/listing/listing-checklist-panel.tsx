'use client';

import { useState } from 'react';
import type { ListingChecklistItem, ListingChecklistCategory } from '@/types';
import { updateChecklistItemAction } from '@/app/actions/listing-actions';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, AlertTriangle, Minus } from 'lucide-react';

const categoryLabels: Record<ListingChecklistCategory, string> = {
  property_details: 'Property Details',
  disclosures: 'Disclosures',
  photography: 'Photography',
  staging: 'Staging',
  pricing: 'Pricing',
  listing_description: 'Listing Description',
  mls_readiness: 'MLS Readiness',
  documents: 'Documents',
  marketing: 'Marketing',
  general: 'General',
};

export function ListingChecklistPanel({ items }: { items: ListingChecklistItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Group by category
  const grouped = items.reduce<Record<string, ListingChecklistItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  async function toggleItem(item: ListingChecklistItem) {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    setLoading(item.id);
    await updateChecklistItemAction(item.id, newStatus);
    setLoading(null);
    router.refresh();
  }

  const completedCount = items.filter(i => i.status === 'completed').length;
  const totalCount = items.length;

  return (
    <div className="rounded-2xl border bg-card p-7">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Listing Prep Checklist
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {categoryLabels[category as ListingChecklistCategory] ?? category}
            </div>
            <div className="space-y-1">
              {catItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  disabled={loading === item.id || item.status === 'blocked'}
                  className={cn(
                    'flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-muted/40 disabled:opacity-50',
                    item.status === 'completed' && 'opacity-60',
                  )}
                >
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : item.status === 'blocked' ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  ) : item.status === 'skipped' ? (
                    <Minus className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-[13px] font-medium',
                      item.status === 'completed' && 'line-through text-muted-foreground',
                    )}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1">
                        {item.description}
                      </div>
                    )}
                    {item.blocker_reason && (
                      <div className="text-[11px] text-red-500 mt-0.5">
                        Blocked: {item.blocker_reason}
                      </div>
                    )}
                  </div>
                  {item.is_required && item.status !== 'completed' && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                      Required
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
