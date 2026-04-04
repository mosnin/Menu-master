import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  FileText,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Clock,
  Bot,
  User,
  Monitor,
  DollarSign,
  Home,
  Shield,
  Bell,
  ThumbsUp,
  FileSearch,
  Link as LinkIcon,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string | null;
  status: string;
  source: string;
  created_at: string;
  related_document_id?: string | null;
  related_approval_id?: string | null;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  transactionId?: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  contract_uploaded: <FileText className="h-4 w-4 text-blue-600" />,
  inspection_deadline: <FileSearch className="h-4 w-4 text-orange-600" />,
  financing_contingency: <DollarSign className="h-4 w-4 text-green-600" />,
  closing_date: <Home className="h-4 w-4 text-emerald-600" />,
  document_processed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  email_sent: <Mail className="h-4 w-4 text-blue-600" />,
  approval_requested: <ThumbsUp className="h-4 w-4 text-purple-600" />,
  reminder_scheduled: <Bell className="h-4 w-4 text-yellow-600" />,
  title_search: <Shield className="h-4 w-4 text-cyan-600" />,
  appraisal: <DollarSign className="h-4 w-4 text-amber-600" />,
};

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  upcoming: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
  cancelled: 'secondary',
};

const statusDotColors: Record<string, string> = {
  completed: 'bg-green-500 ring-green-100',
  overdue: 'bg-red-500 ring-red-100',
  in_progress: 'bg-blue-500 ring-blue-100',
  upcoming: 'bg-gray-400 ring-gray-100',
  cancelled: 'bg-gray-300 ring-gray-50',
};

const sourceConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  system: {
    label: 'System',
    icon: <Monitor className="h-3 w-3" />,
    className: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  ai_generated: {
    label: 'AI',
    icon: <Bot className="h-3 w-3" />,
    className: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  manual: {
    label: 'Manual',
    icon: <User className="h-3 w-3" />,
    className: 'text-blue-600 bg-blue-50 border-blue-200',
  },
};

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  if (diffDays === 0) return `${formatted} (today)`;
  if (diffDays === 1) return `${formatted} (tomorrow)`;
  if (diffDays === -1) return `${formatted} (yesterday)`;
  if (diffDays > 0 && diffDays <= 7) return `${formatted} (in ${diffDays} days)`;
  if (diffDays < 0 && diffDays >= -7) return `${formatted} (${Math.abs(diffDays)} days ago)`;
  return formatted;
}

export function TimelineView({ events, transactionId }: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No timeline events yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Events will appear as documents are processed and milestones are reached.
        </p>
      </div>
    );
  }

  // Sort chronologically (earliest event_date first, nulls at end)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
    return dateA - dateB;
  });

  // Group events by month
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  let currentLabel = '';
  for (const event of sortedEvents) {
    const date = event.event_date ? new Date(event.event_date) : null;
    const label = date
      ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unscheduled';
    if (label !== currentLabel) {
      groups.push({ label, events: [] });
      currentLabel = label;
    }
    groups[groups.length - 1].events.push(event);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 sticky top-0 bg-background py-1">
            {group.label}
          </h4>
          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {group.events.map((event) => {
                const dotColor = statusDotColors[event.status] ?? 'bg-gray-400 ring-gray-100';
                const source = sourceConfig[event.source] ?? sourceConfig.system;

                return (
                  <div key={event.id} className="relative flex gap-4 pl-10">
                    <div className={`absolute left-[10px] top-3.5 h-2.5 w-2.5 rounded-full ring-4 ${dotColor}`} />
                    <div className={`flex-1 rounded-lg border p-3 transition-colors ${
                      event.status === 'overdue' ? 'border-red-200 bg-red-50/40' :
                      event.status === 'completed' ? 'border-green-100 bg-green-50/30' :
                      ''
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0">
                            {eventIcons[event.event_type] ?? <Calendar className="h-4 w-4 text-muted-foreground" />}
                          </span>
                          <p className="text-sm font-medium">{event.title}</p>
                        </div>
                        <Badge variant={statusColors[event.status] ?? 'secondary'} className="shrink-0">
                          {event.status}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{event.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 ml-6 flex-wrap">
                        {event.event_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatEventDate(event.event_date)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${source.className}`}>
                          {source.icon}
                          {source.label}
                        </span>
                        {event.related_document_id && transactionId && (
                          <a
                            href={`/transactions/${transactionId}/documents`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            View document
                          </a>
                        )}
                        {event.related_approval_id && transactionId && (
                          <a
                            href={`/transactions/${transactionId}/communications`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            View approval
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
