import { register as registerRecomputeCompleteness } from './recompute-completeness';
import { register as registerRecomputeExceptions } from './recompute-exceptions';
import { register as registerRecomputeHealthScore } from './recompute-health-score';
import { register as registerCreateNotification } from './create-notification';
import { register as registerCreateChecklistItem } from './create-checklist-item';
import { register as registerCreateTimelineEvent } from './create-timeline-event';
import { register as registerCreateReminderDraft } from './create-reminder-draft';
import { register as registerCreateDocumentRequest } from './create-document-request';
import { register as registerAssignOwner } from './assign-owner';
import { register as registerRequestManualReview } from './request-manual-review';
import { register as registerCreateApprovalRequest } from './create-approval-request';
import { register as registerSuggestStageTransition } from './suggest-stage-transition';
import { register as registerSuggestFollowUpDraft } from './suggest-follow-up-draft';
import { register as registerMarkCounterpartyWaiting } from './mark-counterparty-waiting';
import { register as registerCreateNextActionCard } from './create-next-action-card';
import { register as registerAssignTask } from './assign-task';

let registered = false;

export function registerAllTools(): void {
  if (registered) return;

  registerRecomputeCompleteness();
  registerRecomputeExceptions();
  registerRecomputeHealthScore();
  registerCreateNotification();
  registerCreateChecklistItem();
  registerCreateTimelineEvent();
  registerCreateReminderDraft();
  registerCreateDocumentRequest();
  registerAssignOwner();
  registerRequestManualReview();
  registerCreateApprovalRequest();
  registerSuggestStageTransition();
  registerSuggestFollowUpDraft();
  registerMarkCounterpartyWaiting();
  registerCreateNextActionCard();
  registerAssignTask();

  registered = true;
}
