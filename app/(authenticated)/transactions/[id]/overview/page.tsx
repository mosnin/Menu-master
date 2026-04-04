import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Upload,
  Sparkles,
  CircleDot,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { CompletenessBadge } from '@/components/transaction/completeness-badge';
import { ExceptionAlerts } from '@/components/transaction/exception-alerts';
import { RecommendationCards } from '@/components/transaction/recommendation-cards';
import { AssignmentPanel } from '@/components/transaction/assignment-panel';

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function OverviewPage({ params }: OverviewPageProps) {
  const { id: transactionId } = await params;

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      {/* Main Content - Left 2/3 */}
      <div className="lg:col-span-2 space-y-10">
        {/* Completeness Badge */}
        <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-muted/30" />}>
          <CompletenessBadge transactionId={transactionId} />
        </Suspense>

        {/* Transaction Status Banner */}
        <Card className="rounded-2xl border-blue-200/50 bg-gradient-to-br from-blue-50/90 via-blue-50/50 to-transparent shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100/80 ring-1 ring-blue-200/40">
                  <CircleDot className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold text-blue-900 tracking-tight">Draft</p>
                    <Badge variant="secondary" className="text-xs font-medium">New</Badge>
                  </div>
                  <p className="text-sm text-blue-700/70 mt-1 leading-relaxed">
                    Upload a purchase agreement to move this transaction forward.
                  </p>
                </div>
              </div>
              <Button size="sm" className="rounded-lg px-4 py-2" asChild>
                <Link href="documents" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exception Alerts */}
        <ExceptionAlerts transactionId={transactionId} />

        {/* Recommendations */}
        <RecommendationCards transactionId={transactionId} />

        {/* Next Steps */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3 px-7 pt-7">
            <CardTitle className="flex items-center gap-3 text-base tracking-tight">
              <Sparkles className="h-4.5 w-4.5 text-purple-600" />
              Next Steps
            </CardTitle>
            <CardDescription className="mt-1.5 leading-relaxed">Recommended actions to move this transaction forward</CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-3">
            <ol className="space-y-5">
              <li className="flex items-start gap-5 rounded-xl border-2 border-purple-200/70 p-5 bg-gradient-to-r from-purple-50/60 to-purple-50/10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white shadow-sm">
                  1
                </span>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-purple-900">Upload the purchase agreement</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    The AI will extract property address, parties, price, and key dates automatically.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg shrink-0 px-4" asChild>
                  <Link href="documents">Upload</Link>
                </Button>
              </li>
              <li className="flex items-start gap-5 rounded-xl border p-5 transition-colors duration-200 hover:bg-muted/30">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  2
                </span>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Review extracted data</p>
                  <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed">
                    Verify the AI-extracted details are accurate and approve them.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-5 rounded-xl border p-5 transition-colors duration-200 hover:bg-muted/30">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  3
                </span>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Complete the checklist</p>
                  <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed">
                    Work through required items like disclosures, inspections, and title work.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="px-7 pt-7">
            <CardTitle className="flex items-center gap-3 text-base tracking-tight">
              <Home className="h-4 w-4 text-muted-foreground" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed bg-muted/15">
              <Search className="h-7 w-7 text-muted-foreground/60 mb-4" />
              <p className="text-sm font-semibold tracking-tight">No property address set</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Upload a purchase agreement and the property address, price, and details will be extracted automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="px-7 pt-7">
            <CardTitle className="flex items-center gap-3 text-base tracking-tight">
              <Users className="h-4 w-4 text-muted-foreground" />
              Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed bg-muted/15">
              <Users className="h-7 w-7 text-muted-foreground/60 mb-4" />
              <p className="text-sm font-semibold tracking-tight">No parties added yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Buyer, seller, and agent details will be extracted from uploaded documents. You can also add them manually.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Dates */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="px-7 pt-7">
            <CardTitle className="flex items-center gap-3 text-base tracking-tight">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed bg-muted/15">
              <Calendar className="h-7 w-7 text-muted-foreground/60 mb-4" />
              <p className="text-sm font-semibold tracking-tight">No dates extracted yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Closing date, inspection deadline, contingency dates, and more will appear here once documents are processed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Right 1/3 */}
      <div className="space-y-8">
        {/* Assignment Panel */}
        <AssignmentPanel transactionId={transactionId} />

        {/* Extraction Summary */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-4 p-7">
            <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Extraction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <div className="space-y-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Documents processed</span>
                <span className="font-semibold tabular-nums">0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields extracted</span>
                <span className="font-semibold tabular-nums">0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending review</span>
                <span className="font-semibold tabular-nums">0</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
              Upload documents to see AI-extracted data here.
            </p>
          </CardContent>
        </Card>

        {/* Missing Items */}
        <Card className="rounded-2xl shadow-sm border-l-4 border-l-amber-400 border-amber-200/50">
          <CardHeader className="pb-4 p-7">
            <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Missing Items
            </CardTitle>
            <CardDescription className="mt-1.5">Required documents not yet uploaded</CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <ul className="space-y-1.5">
              <li>
                <Link href="documents" className="flex items-center gap-3.5 text-sm rounded-lg p-3 -mx-3 hover:bg-amber-50 transition-colors duration-200 group">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="flex-1">Purchase agreement</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
              </li>
              <li>
                <Link href="documents" className="flex items-center gap-3.5 text-sm rounded-lg p-3 -mx-3 hover:bg-amber-50 transition-colors duration-200 group">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="flex-1">Seller disclosures</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
              </li>
              <li>
                <Link href="documents" className="flex items-center gap-3.5 text-sm rounded-lg p-3 -mx-3 hover:bg-amber-50 transition-colors duration-200 group">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="flex-1">Preliminary title report</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
              </li>
            </ul>
            <Button variant="outline" size="sm" className="w-full mt-6 rounded-lg" asChild>
              <Link href="documents" className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" />
                Upload Documents
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-4 p-7">
            <CardTitle className="flex items-center gap-3 text-sm font-semibold tracking-tight">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Latest Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-0">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 ring-1 ring-blue-200/40">
                    <CircleDot className="h-3.5 w-3.5 text-blue-700" />
                  </div>
                  <div className="w-px flex-1 bg-border mt-1.5" />
                </div>
                <div className="pb-4 pt-1">
                  <p className="text-sm font-medium">Transaction created</p>
                  <p className="text-xs text-muted-foreground mt-1">Just now</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-4 rounded-lg" asChild>
              <Link href="audit-log" className="flex items-center gap-1.5 text-xs">
                View full audit log
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
