import { inngest } from './client';

/** Deadline window (in days) for the daily deadline check. */
const DEADLINE_WINDOW_DAYS = parseInt(
  process.env.ORCHESTRATOR_DEADLINE_WINDOW_DAYS ?? '3',
  10,
);

/**
 * Retry helper: runs `fn` up to `maxRetries` additional times with exponential
 * backoff (1 s, 3 s) before re-throwing the last error.
 */
async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  const backoffMs = [1000, 3000];
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, backoffMs[attempt] ?? 3000));
      }
    }
  }
  throw lastError;
}

// 1. Scheduled observation — runs every 30 minutes for all active orchestrators
export const scheduledObservation = inngest.createFunction(
  {
    id: 'orchestrator-scheduled-observation',
    concurrency: { limit: 5 },
  },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    // Import dynamically to avoid circular deps
    const { findActive } = await import('@/lib/repositories/deal-orchestrators');
    const { runOrchestrationCycle } = await import('@/lib/orchestrator/decision-pipeline');

    const orchestrators = await step.run('load-active-orchestrators', async () => {
      return findActive();
    });

    // Process each orchestrator with concurrency control
    let processed = 0;
    let skipped = 0;
    const errors: Array<{ orchestratorId: string; error: string }> = [];

    for (const orch of orchestrators) {
      // Skip if observed recently (within last 20 minutes) — debounce
      if (orch.last_observed_at) {
        const lastObserved = new Date(orch.last_observed_at).getTime();
        const twentyMinAgo = Date.now() - 20 * 60 * 1000;
        if (lastObserved > twentyMinAgo) {
          skipped++;
          continue;
        }
      }

      await step.run(`observe-${orch.id}`, async () => {
        try {
          await withRetries(() => runOrchestrationCycle(orch.id, 'scheduled'));
          processed++;
        } catch (error) {
          // Log but don't fail the whole batch
          console.error(`Orchestrator cycle failed for ${orch.id}:`, error);
          errors.push({
            orchestratorId: orch.id,
            error: error instanceof Error ? error.message : String(error),
          });

          // Update orchestrator risk_summary with error info
          try {
            const { update } = await import('@/lib/repositories/deal-orchestrators');
            await update(orch.id, {
              risk_summary: {
                last_error: error instanceof Error ? error.message : String(error),
                last_error_at: new Date().toISOString(),
                consecutive_failures: ((orch as any).risk_summary?.consecutive_failures ?? 0) + 1,
              },
            });
          } catch (updateErr) {
            console.error(`Failed to update risk_summary for ${orch.id}:`, updateErr);
          }
        }
      });
    }

    return { processed, skipped, errors: errors.length, total: orchestrators.length };
  },
);

// 2. Event-triggered observation — fires when domain events happen
export const eventTriggeredObservation = inngest.createFunction(
  {
    id: 'orchestrator-event-observation',
    concurrency: { limit: 10 },
    debounce: {
      key: 'event.data.entity_type + "-" + event.data.entity_id',
      period: '2m', // Debounce same entity events within 2 minutes
    },
  },
  { event: 'orchestrator/entity.changed' },
  async ({ event, step }) => {
    const { entity_type, entity_id, trigger_type, metadata } = event.data;

    const { findByEntity, update } = await import('@/lib/repositories/deal-orchestrators');
    const { runOrchestrationCycle } = await import('@/lib/orchestrator/decision-pipeline');

    const orchestrator = await step.run('find-orchestrator', async () => {
      return findByEntity(entity_type, entity_id);
    });

    if (!orchestrator || orchestrator.status !== 'active') {
      return { skipped: true, reason: 'no active orchestrator' };
    }

    try {
      const cycle = await step.run('run-cycle', async () => {
        return withRetries(() => runOrchestrationCycle(orchestrator.id, trigger_type, metadata));
      });

      return { orchestratorId: orchestrator.id, cycleId: cycle.id, status: cycle.status };
    } catch (error) {
      // Track error in orchestrator risk_summary
      try {
        await step.run('track-error', async () => {
          await update(orchestrator.id, {
            risk_summary: {
              last_error: error instanceof Error ? error.message : String(error),
              last_error_at: new Date().toISOString(),
              trigger_type,
              entity_type,
              entity_id,
            },
          });
        });
      } catch (updateErr) {
        console.error(`Failed to update risk_summary for ${orchestrator.id}:`, updateErr);
      }

      throw error; // Re-throw so Inngest marks the function as failed
    }
  },
);

// 3. Deadline approaching check — runs daily, finds approaching deadlines
export const deadlineCheck = inngest.createFunction(
  {
    id: 'orchestrator-deadline-check',
    concurrency: { limit: 1 },
  },
  { cron: '0 8 * * *' }, // 8 AM daily
  async ({ step }) => {
    const { supabase } = await import('@/lib/db/client');
    const { findByEntity } = await import('@/lib/repositories/deal-orchestrators');
    const { runOrchestrationCycle } = await import('@/lib/orchestrator/decision-pipeline');

    // Find transactions with checklist items due within the configurable window
    const windowEnd = new Date(Date.now() + DEADLINE_WINDOW_DAYS * 86400000).toISOString();
    const { data: urgentItems } = await step.run('find-urgent-deadlines', async () => {
      return supabase
        .from('checklist_items')
        .select('transaction_id')
        .lt('due_date', windowEnd)
        .gt('due_date', new Date().toISOString())
        .not('status', 'in', '("completed","skipped")')
        .limit(100);
    });

    const transactionIds = [...new Set((urgentItems ?? []).map((i: any) => i.transaction_id))];
    let triggered = 0;

    for (const txnId of transactionIds) {
      const orch = await step.run(`find-orch-${txnId}`, async () => {
        return findByEntity('transaction', txnId);
      });

      if (orch && orch.status === 'active') {
        await step.run(`deadline-cycle-${txnId}`, async () => {
          await withRetries(() =>
            runOrchestrationCycle(orch.id, 'deadline_approaching', { transaction_id: txnId }),
          );
        });
        triggered++;
      }
    }

    return { checked: transactionIds.length, triggered };
  },
);

// 4. Stale action cleanup — runs hourly
export const staleActionCleanup = inngest.createFunction(
  {
    id: 'orchestrator-stale-action-cleanup',
    concurrency: { limit: 1 },
  },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const { supabase } = await import('@/lib/db/client');

    // Mark expired next actions as stale
    const { count } = await step.run('mark-stale-actions', async () => {
      const result = await supabase
        .from('orchestrator_next_actions')
        .update({ status: 'stale', updated_at: new Date().toISOString() })
        .eq('status', 'active')
        .lt('stale_after', new Date().toISOString())
        .select('id');
      return { count: result.data?.length ?? 0 };
    });

    // Mark overdue obligations
    const { count: overdueCount } = await step.run('mark-overdue-obligations', async () => {
      const result = await supabase
        .from('orchestrator_obligations')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('status', 'open')
        .lt('due_at', new Date().toISOString())
        .select('id');
      return { count: result.data?.length ?? 0 };
    });

    return { staleActions: count, overdueObligations: overdueCount };
  },
);
