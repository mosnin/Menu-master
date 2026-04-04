import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  FileText,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Clock,
  Bot,
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
}

interface TimelineViewProps {
  events: TimelineEvent[];
}

const eventIcons: Record<string, React.ReactNode> = {
  contract_uploaded: <FileText className="h-4 w-4" />,
  inspection_deadline: <Calendar className="h-4 w-4" />,
  financing_contingency: <Calendar className="h-4 w-4" />,
  closing_date: <Calendar className="h-4 w-4" />,
  document_processed: <CheckCircle2 className="h-4 w-4" />,
  email_sent: <Mail className="h-4 w-4" />,
  approval_requested: <Clock className="h-4 w-4" />,
  reminder_scheduled: <AlertTriangle className="h-4 w-4" />,
};

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  upcoming: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
  cancelled: 'secondary',
};

export function TimelineView({ events }: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No timeline events yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Events will appear as documents are processed and milestones are reached.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="relative flex gap-4 pl-10">
            <div className="absolute left-2.5 flex h-3 w-3 items-center justify-center rounded-full border bg-background">
              <div className={`h-1.5 w-1.5 rounded-full ${
                event.status === 'completed' ? 'bg-green-500' :
                event.status === 'overdue' ? 'bg-red-500' :
                'bg-muted-foreground'
              }`} />
            </div>
            <div className="flex-1 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {eventIcons[event.event_type] ?? <Calendar className="h-4 w-4" />}
                  <p className="text-sm font-medium">{event.title}</p>
                </div>
                <Badge variant={statusColors[event.status] ?? 'secondary'}>
                  {event.status}
                </Badge>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {event.event_date && (
                  <span>{new Date(event.event_date).toLocaleDateString()}</span>
                )}
                {event.source === 'ai_generated' && (
                  <span className="flex items-center gap-1">
                    <Bot className="h-3 w-3" /> AI Generated
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
