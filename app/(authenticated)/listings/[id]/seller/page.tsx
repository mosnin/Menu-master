'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { getListingAction } from '@/app/actions/listing-actions';
import {
  inviteSellerAction,
  revokeSellerAccessAction,
  getSellerPortalAccessAction,
  createSellerDocRequestAction,
  getSellerDocRequestsAction,
} from '@/app/actions/seller-portal-actions';
import type { Listing, SellerPortalAccess, SellerDocumentRequest } from '@/types';
import { ArrowLeft, UserPlus, Shield, FileUp, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SellerPortalManagementPage() {
  const params = useParams();
  const listingId = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [access, setAccess] = useState<SellerPortalAccess[]>([]);
  const [docRequests, setDocRequests] = useState<SellerDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showDocRequest, setShowDocRequest] = useState(false);

  useEffect(() => {
    async function load() {
      const [l, a, d] = await Promise.all([
        getListingAction(listingId),
        getSellerPortalAccessAction(listingId),
        getSellerDocRequestsAction(listingId),
      ]);
      setListing(l);
      setAccess(a);
      setDocRequests(d);
      setLoading(false);
    }
    load();
  }, [listingId]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await inviteSellerAction(listingId, {
      sellerEmail: fd.get('sellerEmail') as string,
      sellerName: fd.get('sellerName') as string,
    });
    if (result.error) {
      alert(result.error);
    } else {
      setShowInvite(false);
      const a = await getSellerPortalAccessAction(listingId);
      setAccess(a);
    }
  }

  async function handleRevoke(accessId: string) {
    if (!confirm('Revoke this seller\'s portal access?')) return;
    await revokeSellerAccessAction(accessId);
    const a = await getSellerPortalAccessAction(listingId);
    setAccess(a);
  }

  async function handleDocRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await createSellerDocRequestAction(listingId, {
      documentType: fd.get('documentType') as string,
      description: fd.get('description') as string || undefined,
      dueDate: fd.get('dueDate') as string || undefined,
    });
    if (result.error) {
      alert(result.error);
    } else {
      setShowDocRequest(false);
      const d = await getSellerDocRequestsAction(listingId);
      setDocRequests(d);
    }
  }

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 w-48 bg-muted rounded mb-6" /><div className="h-64 bg-muted rounded-2xl" /></div>;
  }

  if (!listing) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Listing not found</p></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href={`/listings/${listingId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader
          title={`Seller Portal — ${listing.title}`}
          description="Manage seller access, document requests, and visibility"
        />
      </div>

      {/* Portal Access */}
      <Card className="rounded-2xl">
        <CardContent className="p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Seller Access
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowInvite(!showInvite)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite Seller
            </Button>
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="mb-5 p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px]">Name</Label>
                  <Input name="sellerName" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Email</Label>
                  <Input name="sellerEmail" type="email" required className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" size="sm">Send Invite</Button>
              </div>
            </form>
          )}

          {access.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">No seller access configured</p>
          ) : (
            <div className="space-y-3">
              {access.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border">
                  <div className="flex items-center gap-3">
                    <Shield className={cn('h-4 w-4', a.is_active ? 'text-green-500' : 'text-muted-foreground/30')} />
                    <div>
                      <div className="text-[13px] font-medium">{a.seller_name}</div>
                      <div className="text-[11px] text-muted-foreground/60">{a.seller_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {a.is_active ? 'Active' : 'Revoked'}
                    </Badge>
                    {a.last_accessed_at && (
                      <span className="text-[11px] text-muted-foreground/50">
                        Last: {new Date(a.last_accessed_at).toLocaleDateString()}
                      </span>
                    )}
                    {a.is_active && (
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600" onClick={() => handleRevoke(a.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Requests */}
      <Card className="rounded-2xl">
        <CardContent className="p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Document Requests
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowDocRequest(!showDocRequest)}>
              <FileUp className="h-3.5 w-3.5 mr-1.5" />
              Request Document
            </Button>
          </div>

          {showDocRequest && (
            <form onSubmit={handleDocRequest} className="mb-5 p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px]">Document Type</Label>
                  <Input name="documentType" required placeholder="e.g. Seller Disclosures" className="mt-1" />
                </div>
                <div>
                  <Label className="text-[13px]">Due Date</Label>
                  <Input name="dueDate" type="date" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-[13px]">Description</Label>
                <Input name="description" placeholder="Additional details..." className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowDocRequest(false)}>Cancel</Button>
                <Button type="submit" size="sm">Send Request</Button>
              </div>
            </form>
          )}

          {docRequests.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">No document requests sent</p>
          ) : (
            <div className="space-y-2">
              {docRequests.map(dr => (
                <div key={dr.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border">
                  <div>
                    <div className="text-[13px] font-medium">{dr.document_type}</div>
                    {dr.description && <div className="text-[11px] text-muted-foreground/60">{dr.description}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    {dr.due_date && <span className="text-[11px] text-muted-foreground/50">Due: {dr.due_date}</span>}
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]',
                        dr.status === 'uploaded' && 'bg-green-50 text-green-700 border-green-200',
                        dr.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                        dr.status === 'viewed' && 'bg-blue-50 text-blue-700 border-blue-200',
                      )}
                    >
                      {dr.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
