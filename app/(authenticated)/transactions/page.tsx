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
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState as SharedEmptyState } from '@/components/ui/empty-state';
import { humanizeStatus } from '@/lib/format';
import { StageBadge } from '@/components/transaction/stage-badge';
import type { TransactionStage } from '@/types';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  pending_closing: 'warning',
  closed: 'success',
  cancelled: 'destructive',
};

function LocalEmptyState() {
  return (
    <SharedEmptyState
      icon={FileText}
      title="No transactions yet"
      description="Create your first transaction to start organizing documents and tracking deadlines."
      action={
        <Button asChild className="rounded-lg px-5 py-2.5">
          <Link href="/transactions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      }
    />
  );
}

function TransactionCard({
  id,
  address,
  status,
  stage,
  price,
  closingDate,
  documentsCount,
}: {
  id: string;
  address: string;
  status: string;
  stage?: TransactionStage;
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
              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                {stage && <StageBadge stage={stage} />}
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
                {humanizeStatus(status)}
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
      <PageHeader
        title="Transactions"
        description="Manage your real estate transactions"
        actions={
          <Button asChild className="rounded-lg px-5 py-2.5">
            <Link href="/transactions/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="p-1">
          <TabsTrigger value="all" className="px-6 py-2.5 text-sm">All</TabsTrigger>
          <TabsTrigger value="active" className="px-6 py-2.5 text-sm">Active</TabsTrigger>
          <TabsTrigger value="draft" className="px-6 py-2.5 text-sm">Draft</TabsTrigger>
          <TabsTrigger value="closed" className="px-6 py-2.5 text-sm">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-8">
          {transactions.length === 0 ? (
            <LocalEmptyState />
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} {...tx} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-8">
          <LocalEmptyState />
        </TabsContent>
        <TabsContent value="draft" className="mt-8">
          <LocalEmptyState />
        </TabsContent>
        <TabsContent value="closed" className="mt-8">
          <LocalEmptyState />
        </TabsContent>
      </Tabs>
    </div>
  );
}
