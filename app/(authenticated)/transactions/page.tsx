'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus,
  FileText,
  Search,
  Upload,
  ArrowRight,
  Home,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  pending_closing: 'warning',
  closed: 'success',
  cancelled: 'destructive',
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 px-6 text-center">
      <div className="rounded-full bg-muted/60 p-5 mb-5">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">No transactions yet</h3>
      <p className="text-sm text-muted-foreground mt-2.5 mb-8 max-w-md leading-relaxed">
        Transactions are the core of Deal Desk. Create one to start managing
        documents, tracking deadlines, and using AI-powered extraction.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="rounded-lg">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Transaction
          </Link>
        </Button>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-3 w-full max-w-lg">
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/40">
          <Upload className="h-5 w-5 text-muted-foreground mb-2.5" />
          <p className="text-xs font-medium">Upload Documents</p>
          <p className="text-xs text-muted-foreground mt-1">PDFs, images, contracts</p>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/40">
          <Search className="h-5 w-5 text-muted-foreground mb-2.5" />
          <p className="text-xs font-medium">AI Extraction</p>
          <p className="text-xs text-muted-foreground mt-1">Auto-extract key data</p>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/40">
          <Calendar className="h-5 w-5 text-muted-foreground mb-2.5" />
          <p className="text-xs font-medium">Track Deadlines</p>
          <p className="text-xs text-muted-foreground mt-1">Never miss a date</p>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({
  id,
  address,
  status,
  price,
  closingDate,
  documentsCount,
}: {
  id: string;
  address: string;
  status: string;
  price: string;
  closingDate: string;
  documentsCount: number;
}) {
  return (
    <Link href={`/transactions/${id}/overview`} className="group block">
      <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-semibold truncate tracking-tight">{address}</p>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground">
                <span>{price}</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {closingDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  {documentsCount} docs
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <Badge variant={statusColors[status] || 'secondary'} className="px-2.5 py-0.5">
                {status.replace('_', ' ')}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState('all');

  // Placeholder: no transactions yet
  const transactions: Array<{
    id: string;
    address: string;
    status: string;
    price: string;
    closingDate: string;
    documentsCount: number;
  }> = [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">Manage your real estate transactions</p>
        </div>
        <Button asChild className="rounded-lg">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="px-5 py-2">All</TabsTrigger>
          <TabsTrigger value="active" className="px-5 py-2">Active</TabsTrigger>
          <TabsTrigger value="draft" className="px-5 py-2">Draft</TabsTrigger>
          <TabsTrigger value="closed" className="px-5 py-2">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {transactions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} {...tx} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-6">
          <EmptyState />
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          <EmptyState />
        </TabsContent>
        <TabsContent value="closed" className="mt-6">
          <EmptyState />
        </TabsContent>
      </Tabs>
    </div>
  );
}
