'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ScrollText,
  Bot,
  User,
  Monitor,
  ChevronDown,
  ChevronRight,
  FileText,
  Mail,
  CheckCircle2,
  Upload,
  Edit,
  Trash2,
  Eye,
  Shield,
  Clock,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor_type: 'user' | 'system' | 'ai';
  actor_name: string;
  action: string;
  target_type: string;
  target_name: string;
  details: string | null;
  metadata: Record<string, unknown> | null;
}

const actorConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  user: {
    icon: <User className="h-3.5 w-3.5" />,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  system: {
    icon: <Monitor className="h-3.5 w-3.5" />,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  ai: {
    icon: <Bot className="h-3.5 w-3.5" />,
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload className="h-3.5 w-3.5" />,
  extract: <Eye className="h-3.5 w-3.5" />,
  approve: <CheckCircle2 className="h-3.5 w-3.5" />,
  reject: <Trash2 className="h-3.5 w-3.5" />,
  send: <Mail className="h-3.5 w-3.5" />,
  create: <FileText className="h-3.5 w-3.5" />,
  update: <Edit className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  review: <Shield className="h-3.5 w-3.5" />,
};

function getActionIcon(action: string): React.ReactNode {
  const key = Object.keys(actionIcons).find(k => action.toLowerCase().includes(k));
  return key ? actionIcons[key] : <Clock className="h-3.5 w-3.5" />;
}

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[160px_120px_1fr_140px_140px] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
        <span>Timestamp</span>
        <span>Actor</span>
        <span>Action</span>
        <span>Target</span>
        <span>Details</span>
      </div>

      <div className="divide-y">
        {entries.map((entry) => {
          const actor = actorConfig[entry.actor_type] ?? actorConfig.system;
          const { date, time } = formatTimestamp(entry.timestamp);
          const isExpanded = expandedId === entry.id;
          const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

          return (
            <div key={entry.id}>
              <div
                className={`grid grid-cols-[160px_120px_1fr_140px_140px] gap-2 px-4 py-2.5 items-center text-sm transition-colors ${
                  hasMetadata ? 'cursor-pointer hover:bg-muted/30' : ''
                }`}
                onClick={() => hasMetadata && setExpandedId(isExpanded ? null : entry.id)}
              >
                {/* Timestamp */}
                <div className="text-xs">
                  <p className="font-medium">{date}</p>
                  <p className="text-muted-foreground">{time}</p>
                </div>

                {/* Actor */}
                <div>
                  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${actor.className}`}>
                    {actor.icon}
                    {entry.actor_type === 'ai' ? 'AI' : entry.actor_type.charAt(0).toUpperCase() + entry.actor_type.slice(1)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.actor_name}</p>
                </div>

                {/* Action */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-muted-foreground">{getActionIcon(entry.action)}</span>
                  <span className="truncate">{entry.action}</span>
                </div>

                {/* Target */}
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{entry.target_type}</p>
                  <p className="text-xs font-medium truncate">{entry.target_name}</p>
                </div>

                {/* Details / expand */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {entry.details ? (
                    <p className="text-xs text-muted-foreground truncate flex-1">{entry.details}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex-1">--</p>
                  )}
                  {hasMetadata && (
                    <span className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded metadata */}
              {isExpanded && hasMetadata && (
                <div className="px-4 pb-3 pt-1 bg-muted/10 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Metadata
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Object.entries(entry.metadata!).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded bg-background border px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium font-mono text-xs">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const entries: AuditEntry[] = []; // populated by data fetching

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Complete history of actions for this transaction.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <ScrollText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No audit entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            All actions including document uploads, extractions, approvals, and emails are logged here.
          </p>
        </div>
      ) : (
        <AuditLogTable entries={entries} />
      )}
    </div>
  );
}
