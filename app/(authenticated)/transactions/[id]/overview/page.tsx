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

export default async function OverviewPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content - Left 2/3 */}
      <div className="lg:col-span-2 space-y-6">
        {/* Transaction Status Banner */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <CircleDot className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-blue-900">Draft</p>
                    <Badge variant="secondary">New</Badge>
                  </div>
                  <p className="text-sm text-blue-700">
                    Upload a purchase agreement to move this transaction forward.
                  </p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link href="documents" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Next Steps
            </CardTitle>
            <CardDescription>Recommended actions to move this transaction forward</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 rounded-lg border p-3 bg-purple-50/50 border-purple-100">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                  1
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Upload the purchase agreement</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The AI will extract property address, parties, price, and key dates automatically.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="documents">Upload</Link>
                </Button>
              </li>
              <li className="flex items-start gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  2
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Review extracted data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verify the AI-extracted details are accurate and approve them.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  3
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Complete the checklist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Work through required items like disclosures, inspections, and title work.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border border-dashed">
              <Search className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No property address set</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Upload a purchase agreement and the property address, price, and details will be extracted automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Parties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border border-dashed">
              <Users className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No parties added yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Buyer, seller, and agent details will be extracted from uploaded documents. You can also add them manually.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border border-dashed">
              <Calendar className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No dates extracted yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Closing date, inspection deadline, contingency dates, and more will appear here once documents are processed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Right 1/3 */}
      <div className="space-y-6">
        {/* Extraction Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Extraction Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Documents processed</span>
                <span className="font-medium">0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields extracted</span>
                <span className="font-medium">0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending review</span>
                <span className="font-medium">0</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Upload documents to see AI-extracted data here.
            </p>
          </CardContent>
        </Card>

        {/* Missing Items */}
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Missing Items
            </CardTitle>
            <CardDescription>Required documents not yet uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <Link href="documents" className="flex items-center gap-2 text-sm rounded-md p-2 -mx-2 hover:bg-yellow-50 transition-colors group">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                  <span className="flex-1">Purchase agreement</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="documents" className="flex items-center gap-2 text-sm rounded-md p-2 -mx-2 hover:bg-yellow-50 transition-colors group">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                  <span className="flex-1">Seller disclosures</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="documents" className="flex items-center gap-2 text-sm rounded-md p-2 -mx-2 hover:bg-yellow-50 transition-colors group">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                  <span className="flex-1">Preliminary title report</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="documents" className="flex items-center gap-2">
                <Upload className="h-3 w-3" />
                Upload Documents
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Latest Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <CircleDot className="h-3 w-3 text-blue-700" />
                  </div>
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium">Transaction created</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link href="audit-log" className="flex items-center gap-1 text-xs">
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
