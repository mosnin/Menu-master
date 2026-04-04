'use client';

import type { WorkflowNodeType } from '@/types';
import { VALID_NODE_TYPES } from '@/lib/services/workflow-graph-validator';
import {
  Play,
  Square,
  GitBranch,
  Clock,
  RefreshCw,
  UserCheck,
  Merge,
  Zap,
  CheckCircle,
  Bell,
  ShieldCheck,
  ListChecks,
  CalendarClock,
  FileSearch,
  HeartPulse,
  AlertTriangle,
  ArrowRightLeft,
  Tag,
  Handshake,
  Webhook,
  Mail,
  CircleDot,
  Brain,
  Sparkles,
  FileSearch2,
  MessageSquare,
  PenLine,
  ShieldAlert,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Node metadata
// ---------------------------------------------------------------------------

interface NodeMeta {
  label: string;
  icon: React.ReactNode;
  group: 'control' | 'domain' | 'agent';
}

const NODE_META: Record<string, NodeMeta> = {
  start: { label: 'Start', icon: <Play className="h-4 w-4" />, group: 'control' },
  stop: { label: 'Stop', icon: <Square className="h-4 w-4" />, group: 'control' },
  condition: { label: 'Condition', icon: <GitBranch className="h-4 w-4" />, group: 'control' },
  branch: { label: 'Branch', icon: <GitBranch className="h-4 w-4" />, group: 'control' },
  wait: { label: 'Wait', icon: <Clock className="h-4 w-4" />, group: 'control' },
  loop: { label: 'Loop', icon: <RefreshCw className="h-4 w-4" />, group: 'control' },
  join: { label: 'Join', icon: <Merge className="h-4 w-4" />, group: 'control' },
  human_checkpoint: { label: 'Human Checkpoint', icon: <UserCheck className="h-4 w-4" />, group: 'control' },

  evaluate_transaction_completeness: { label: 'Eval Transaction Completeness', icon: <CheckCircle className="h-4 w-4" />, group: 'domain' },
  evaluate_listing_readiness: { label: 'Eval Listing Readiness', icon: <CheckCircle className="h-4 w-4" />, group: 'domain' },
  evaluate_closing_readiness: { label: 'Eval Closing Readiness', icon: <CheckCircle className="h-4 w-4" />, group: 'domain' },
  create_notification: { label: 'Create Notification', icon: <Bell className="h-4 w-4" />, group: 'domain' },
  create_approval: { label: 'Create Approval', icon: <ShieldCheck className="h-4 w-4" />, group: 'domain' },
  create_checklist_item: { label: 'Create Checklist Item', icon: <ListChecks className="h-4 w-4" />, group: 'domain' },
  create_timeline_event: { label: 'Create Timeline Event', icon: <CalendarClock className="h-4 w-4" />, group: 'domain' },
  request_missing_document: { label: 'Request Missing Document', icon: <FileSearch className="h-4 w-4" />, group: 'domain' },
  recompute_health_score: { label: 'Recompute Health Score', icon: <HeartPulse className="h-4 w-4" />, group: 'domain' },
  recompute_exceptions: { label: 'Recompute Exceptions', icon: <AlertTriangle className="h-4 w-4" />, group: 'domain' },
  transition_transaction_stage: { label: 'Transition Txn Stage', icon: <ArrowRightLeft className="h-4 w-4" />, group: 'domain' },
  transition_listing_stage: { label: 'Transition Listing Stage', icon: <Tag className="h-4 w-4" />, group: 'domain' },
  handoff_accepted_offer: { label: 'Handoff Accepted Offer', icon: <Handshake className="h-4 w-4" />, group: 'domain' },
  emit_webhook: { label: 'Emit Webhook', icon: <Webhook className="h-4 w-4" />, group: 'domain' },
  send_digest: { label: 'Send Digest', icon: <Mail className="h-4 w-4" />, group: 'domain' },

  agent_next_best_action_planner: { label: 'Next Best Action Planner', icon: <Brain className="h-4 w-4" />, group: 'agent' },
  agent_exception_triage_classifier: { label: 'Exception Triage Classifier', icon: <ShieldAlert className="h-4 w-4" />, group: 'agent' },
  agent_document_classifier: { label: 'Document Classifier', icon: <FileSearch2 className="h-4 w-4" />, group: 'agent' },
  agent_offer_explanation: { label: 'Offer Explanation', icon: <Sparkles className="h-4 w-4" />, group: 'agent' },
  agent_communication_draft: { label: 'Communication Draft', icon: <PenLine className="h-4 w-4" />, group: 'agent' },
  agent_compliance_critic: { label: 'Compliance Critic', icon: <MessageSquare className="h-4 w-4" />, group: 'agent' },
  agent_deal_router: { label: 'Deal Router', icon: <Route className="h-4 w-4" />, group: 'agent' },
};

function getMeta(type: string): NodeMeta {
  return (
    NODE_META[type] ?? {
      label: type
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      icon: <CircleDot className="h-4 w-4" />,
      group: 'domain' as const,
    }
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NodePaletteProps {
  onAddNode: (type: WorkflowNodeType) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const allTypes = Array.from(VALID_NODE_TYPES) as WorkflowNodeType[];

  const controlTypes = allTypes.filter((t) => getMeta(t).group === 'control');
  const domainTypes = allTypes.filter((t) => getMeta(t).group === 'domain');
  const agentTypes = allTypes.filter((t) => getMeta(t).group === 'agent');

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Control Flow */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Control Flow
        </p>
        <div className="flex flex-col gap-1.5">
          {controlTypes.map((type) => {
            const meta = getMeta(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAddNode(type)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg p-2.5 text-left text-sm transition-colors',
                  'hover:bg-muted/40 active:bg-muted/60 cursor-pointer',
                )}
              >
                <span className="text-muted-foreground">{meta.icon}</span>
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Domain Operations */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Domain Operations
        </p>
        <div className="flex flex-col gap-1.5">
          {domainTypes.map((type) => {
            const meta = getMeta(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAddNode(type)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg p-2.5 text-left text-sm transition-colors',
                  'hover:bg-muted/40 active:bg-muted/60 cursor-pointer',
                )}
              >
                <span className="text-muted-foreground">{meta.icon}</span>
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Agents */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          AI Agents
        </p>
        <div className="flex flex-col gap-1.5">
          {agentTypes.map((type) => {
            const meta = getMeta(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAddNode(type)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg p-2.5 text-left text-sm transition-colors',
                  'hover:bg-muted/40 active:bg-muted/60 cursor-pointer',
                )}
              >
                <span className="text-muted-foreground">{meta.icon}</span>
                <span className="font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
