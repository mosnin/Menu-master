import { auth0 } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/session';
import * as inboxService from '@/lib/services/inbox-service';
import * as membershipRepo from '@/lib/repositories/memberships';
import {
  Inbox,
  CheckSquare,
  AlertTriangle,
  AtSign,
  Shield,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, typeof Inbox> = {
  approval: CheckSquare,
  checklist_item: FileText,
  overdue_item: AlertTriangle,
  mention: AtSign,
  document_review: FileText,
  compliance_issue: Shield,
};

const priorityStyles: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-blue-500',
  low: 'border-l-slate-300',
};

const priorityBadgeVariants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  urgent: 'destructive',
  high: 'default',
  normal: 'secondary',
  low: 'outline',
};

export default async function InboxPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/signin');

  let items: inboxService.InboxItem[] = [];
  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const memberships = await membershipRepo.findByUserId(profile.id);
      if (memberships.length > 0) {
        items = await inboxService.getInboxItems(profile.id, memberships[0].organization_id);
      }
    }
  } catch {
    // Show empty state on error
  }

  const urgentCount = items.filter((i) => i.priority === 'urgent').length;
  const highCount = items.filter((i) => i.priority === 'high').length;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Inbox"
        description={
          items.length > 0
            ? `${items.length} item${items.length !== 1 ? 's' : ''} needing your attention${urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}`
            : 'Your personal work items will appear here.'
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Inbox is clear"
          description="Approvals, assigned tasks, mentions, and compliance issues assigned to you will appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = typeIcons[item.type] ?? Inbox;
            return (
              <Link key={item.id} href={item.action_url}>
                <Card className={cn(
                  'border-l-[3px] hover:bg-muted/30 transition-colors duration-150 cursor-pointer',
                  priorityStyles[item.priority],
                )}>
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium truncate">{item.title}</p>
                        <Badge variant={priorityBadgeVariants[item.priority]} className="text-[10px] px-1.5 py-0 shrink-0">
                          {item.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.transaction_title && (
                          <span className="text-[12px] text-muted-foreground/60 truncate">
                            {item.transaction_title}
                          </span>
                        )}
                        {item.due_date && (
                          <span className="text-[11px] text-muted-foreground/40 shrink-0">
                            Due {formatDate(item.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
