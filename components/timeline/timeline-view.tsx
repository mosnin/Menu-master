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
    className: 'text-gray-600 bg-gray-100/60',
  },
  ai_generated: {
    label: 'AI',
    icon: <Bot className="h-3 w-3" />,
    className: 'text-violet-600 bg-violet-50/70',
  },
  manual: {
    label: 'Manual',
    icon: <User className="h-3 w-3" />,
    className: 'text-blue-600 bg-blue-50/70',
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground/40 mb-5" />
        <h3 className="text-lg font-semibold tracking-tight">No timeline events yet</h3>
        <p className="text-sm text-muted-foreground/80 mt-2 max-w-md leading-relaxed">
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
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-5 sticky top-0 bg-background py-2 z-10">
            {group.label}
          </h4>
          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/30" />
            <div className="space-y-4">
              {group.events.map((event) => {
                const dotColor = statusDotColors[event.status] ?? 'bg-gray-400 ring-gray-100';
                const source = sourceConfig[event.source] ?? sourceConfig.system;
                const isActive = event.status === 'in_progress';

                return (
                  <div key={event.id} className="relative flex gap-4 pl-10 overflow-hidden">
                    <div className={`absolute left-[9px] top-[18px] h-3 w-3 rounded-full ring-4 transition-all duration-300 ${dotColor} ${isActive ? 'ring-[6px] scale-110' : ''}`} />
                    <div className={`flex-1 min-w-0 rounded-xl border px-5 py-[18px] transition-all duration-300 hover:shadow-md hover:shadow-black/[0.04] ${
                      event.status === 'overdue' ? 'border-red-200/50 bg-red-50/20' :
                      event.status === 'completed' ? 'border-emerald-100/50 bg-emerald-50/15' :
                      'hover:bg-muted/10'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="shrink-0">
                            {eventIcons[event.event_type] ?? <Calendar className="h-4 w-4 text-muted-foreground" />}
                          </span>
                          <p className="text-sm font-semibold tracking-tight truncate min-w-0">{event.title}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${
                          event.status === 'completed' ? 'bg-emerald-50/70 text-emerald-600' :
                          event.status === 'overdue' ? 'bg-red-50/70 text-red-600' :
                          event.status === 'in_progress' ? 'bg-blue-50/70 text-blue-600' :
                          event.status === 'cancelled' ? 'bg-gray-100/70 text-gray-500' :
                          'bg-gray-100/70 text-gray-600'
                        }`}>
                          {event.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 ml-0 sm:ml-[26px] leading-relaxed">{event.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3.5 ml-0 sm:ml-[26px] flex-wrap">
                        {event.event_date && (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                            <Clock className="h-3 w-3" />
                            {formatEventDate(event.event_date)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${source.className}`}>
                          {source.icon}
                          {source.label}
                        </span>
                        {event.related_document_id && transactionId && (
                          <a
                            href={`/transactions/${transactionId}/documents`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors duration-150"
                          >
                            <LinkIcon className="h-3 w-3" />
                            View document
                          </a>
                        )}
                        {event.related_approval_id && transactionId && (
                          <a
                            href={`/transactions/${transactionId}/communications`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors duration-150"
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
