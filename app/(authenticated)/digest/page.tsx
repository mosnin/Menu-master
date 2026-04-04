import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Newspaper,
  AlertTriangle,
  Clock,
  CheckSquare,
  FileText,
  HeartPulse,
  Timer,
  MessageSquare,
  ArrowRight,
  Inbox,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { getDigestAction } from '@/app/actions/digest-actions';
import { DigestPreviewButton } from '@/components/digest/digest-preview-button';

const SECTION_CONFIG: Record<
  string,
  { icon: React.ElementType; iconColor: string; bgColor: string; label: string }
> = {
  urgent_deadlines: {
    icon: Clock,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    label: 'Urgent Deadlines',
  },
  blocked_transactions: {
    icon: AlertTriangle,
    iconColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    label: 'Blocked Transactions',
  },
  pending_approvals: {
    icon: CheckSquare,
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    label: 'Pending Approvals',
  },
  missing_documents: {
    icon: FileText,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    label: 'Missing Documents',
  },
  health_risks: {
    icon: HeartPulse,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    label: 'Health Risks',
  },
  closing_soon: {
    icon: Timer,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    label: 'Closing Soon',
  },
  stale_responses: {
    icon: MessageSquare,
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    label: 'Stale Responses',
  },
};

const DIGEST_CATEGORIES = [
  { key: 'urgent_deadlines', label: 'Urgent Deadlines' },
  { key: 'blocked_transactions', label: 'Blocked Transactions' },
  { key: 'pending_approvals', label: 'Pending Approvals' },
  { key: 'missing_documents', label: 'Missing Documents' },
  { key: 'health_risks', label: 'Health Risks' },
  { key: 'closing_soon', label: 'Closing Soon' },
  { key: 'stale_responses', label: 'Stale Responses' },
];

function hasDigestContent(content: Record<string, unknown>): boolean {
  return DIGEST_CATEGORIES.some((cat) => {
    const items = content[cat.key];
    return Array.isArray(items) && items.length > 0;
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function DigestPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  const { data: digest } = await getDigestAction();

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Newspaper className="h-6 w-6 text-muted-foreground" />
            Daily Digest
          </h1>
          <p className="mt-1 text-muted-foreground">
            {digest ? `Digest for ${formatDate(digest.digest_date)}` : 'Your daily portfolio summary'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DigestPreviewButton />
          <Button variant="ghost" size="sm" asChild className="rounded-lg">
            <Link href="/settings/digests" className="flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Digest content or empty state */}
      {digest && hasDigestContent(digest.content_json) ? (
        <div className="space-y-6">
          {DIGEST_CATEGORIES.map((cat) => {
            const items = (digest.content_json[cat.key] as Record<string, unknown>[]) ?? [];
            if (items.length === 0) return null;
            const config = SECTION_CONFIG[cat.key] ?? {
              icon: FileText,
              iconColor: 'text-muted-foreground',
              bgColor: 'bg-muted',
              label: cat.label,
            };
            const SectionIcon = config.icon;

            return (
              <Card key={cat.key} className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`rounded-lg p-2 ${config.bgColor}`}>
                      <SectionIcon className={`h-4 w-4 ${config.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold tracking-tight">
                        {config.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const txnId = (item.transaction_id as string) ?? '';
                      const title = (item.title as string) ?? (item.recipient_name as string) ?? 'Untitled';
                      const severity = item.severity as string | undefined;
                      const description = (item.document_type as string) ?? (item.approval_type as string) ?? (item.status as string) ?? '';

                      return (
                        <Link
                          key={`${txnId}-${idx}`}
                          href={txnId ? `/transactions/${txnId}/overview` : '#'}
                          className="group flex items-center justify-between rounded-lg border p-3.5 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{title}</p>
                              {severity && (
                                <Badge
                                  variant={
                                    severity === 'critical' || severity === 'high'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="rounded-md px-1.5 py-0 text-[10px] font-medium"
                                >
                                  {severity}
                                </Badge>
                              )}
                            </div>
                            {description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {description}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-3 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold tracking-tight">No digest available yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Your daily digest will appear here each morning with a summary of your portfolio.
                Use the preview button to see what tomorrow&apos;s digest will look like.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <DigestPreviewButton />
                <Button variant="outline" size="sm" asChild className="rounded-xl">
                  <Link href="/settings/digests" className="flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    Configure Digest
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
