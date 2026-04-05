import { z } from 'zod';

export const AuthoringIntentTriggerSchema = z.object({
  type: z.enum(['document_uploaded', 'transaction_enters_financing', 'listing_launch_blocked', 'scheduled', 'approval_pending_too_long', 'unknown']),
  schedule: z.string().nullable().optional(),
  event: z.string().nullable().optional(),
});

export const AuthoringIntentConditionSchema = z.object({
  id: z.string(),
  expression: z.string(),
  sourceText: z.string(),
  confidence: z.number().min(0).max(1),
});

export const AuthoringIntentActionSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'create_notification',
    'create_checklist_item',
    'request_manual_review',
    'create_approval_request',
    'create_reminder_draft',
    'recompute_readiness',
    'recompute_completeness',
    'update_waiting_state',
    'unsupported',
  ]),
  label: z.string(),
  sourceText: z.string(),
  confidence: z.number().min(0).max(1),
});

export const AuthoringIntentWaitSchema = z.object({
  id: z.string(),
  mode: z.enum(['duration', 'event']),
  durationHours: z.number().int().positive().nullable().optional(),
  eventType: z.string().nullable().optional(),
  sourceText: z.string(),
});

export const AuthoringIntentBranchSchema = z.object({
  id: z.string(),
  conditionText: z.string(),
  onTrue: z.array(z.string()),
  onFalse: z.array(z.string()),
});

export const AuthoringIntentEscalationSchema = z.object({
  id: z.string(),
  afterHours: z.number().int().positive().nullable(),
  action: z.string(),
  sourceText: z.string(),
});

export const AuthoringIntentWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  sourceText: z.string().nullable().optional(),
});

export const WorkflowAuthoringIntentSchema = z.object({
  goal: z.string(),
  actorContext: z.string().nullable().optional(),
  trigger: AuthoringIntentTriggerSchema,
  conditions: z.array(AuthoringIntentConditionSchema),
  actions: z.array(AuthoringIntentActionSchema),
  waits: z.array(AuthoringIntentWaitSchema),
  branches: z.array(AuthoringIntentBranchSchema),
  loops: z.array(z.string()),
  reviews: z.array(z.string()),
  notifications: z.array(z.string()),
  escalations: z.array(AuthoringIntentEscalationSchema),
  timingConstraints: z.array(z.string()),
  fallbackBehavior: z.string().nullable().optional(),
  assumptions: z.array(z.string()),
  ambiguities: z.array(AuthoringIntentWarningSchema),
  missingInformation: z.array(z.string()),
  unsupportedRequests: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type WorkflowAuthoringIntent = z.infer<typeof WorkflowAuthoringIntentSchema>;
