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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 px-8 text-center">
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        <FileText className="h-8 w-8 text-muted-foreground/70" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">No transactions yet</h3>
      <p className="text-sm text-muted-foreground mt-3 mb-10 max-w-md leading-relaxed">
        Transactions are the core of Deal Desk. Create one to start managing
        documents, tracking deadlines, and using AI-powered extraction.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="rounded-lg px-5 py-2.5">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Transaction
          </Link>
        </Button>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3 w-full max-w-lg">
        <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/30">
          <Upload className="h-5 w-5 text-muted-foreground/70 mb-3" />
          <p className="text-xs font-semibold">Upload Documents</p>
          <p className="text-xs text-muted-foreground mt-1.5">PDFs, images, contracts</p>
        </div>
        <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/30">
          <Search className="h-5 w-5 text-muted-foreground/70 mb-3" />
          <p className="text-xs font-semibold">AI Extraction</p>
          <p className="text-xs text-muted-foreground mt-1.5">Auto-extract key data</p>
        </div>
        <div className="flex flex-col items-center text-center p-5 rounded-xl bg-muted/30">
          <Calendar className="h-5 w-5 text-muted-foreground/70 mb-3" />
          <p className="text-xs font-semibold">Track Deadlines</p>
          <p className="text-xs text-muted-foreground mt-1.5">Never miss a date</p>
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
      <Card className="rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-px">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-semibold truncate tracking-tight text-base">{address}</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="font-medium">{price}</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {closingDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {documentsCount} docs
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6 shrink-0">
              <Badge variant={statusColors[status] || 'secondary'} className="px-3 py-1 text-xs font-medium">
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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2 text-base">Manage your real estate transactions</p>
        </div>
        <Button asChild className="rounded-lg px-5 py-2.5">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="p-1">
          <TabsTrigger value="all" className="px-6 py-2.5 text-sm">All</TabsTrigger>
          <TabsTrigger value="active" className="px-6 py-2.5 text-sm">Active</TabsTrigger>
          <TabsTrigger value="draft" className="px-6 py-2.5 text-sm">Draft</TabsTrigger>
          <TabsTrigger value="closed" className="px-6 py-2.5 text-sm">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-8">
          {transactions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} {...tx} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-8">
          <EmptyState />
        </TabsContent>
        <TabsContent value="draft" className="mt-8">
          <EmptyState />
        </TabsContent>
        <TabsContent value="closed" className="mt-8">
          <EmptyState />
        </TabsContent>
      </Tabs>
    </div>
  );
}
