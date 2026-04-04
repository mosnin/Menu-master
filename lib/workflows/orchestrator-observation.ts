import { inngest } from './client';

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
          await runOrchestrationCycle(orch.id, 'scheduled');
          processed++;
        } catch (error) {
          // Log but don't fail the whole batch
          console.error(`Orchestrator cycle failed for ${orch.id}:`, error);
        }
      });
    }

    return { processed, skipped, total: orchestrators.length };
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

    const { findByEntity } = await import('@/lib/repositories/deal-orchestrators');
    const { runOrchestrationCycle } = await import('@/lib/orchestrator/decision-pipeline');

    const orchestrator = await step.run('find-orchestrator', async () => {
      return findByEntity(entity_type, entity_id);
    });

    if (!orchestrator || orchestrator.status !== 'active') {
      return { skipped: true, reason: 'no active orchestrator' };
    }

    const cycle = await step.run('run-cycle', async () => {
      return runOrchestrationCycle(orchestrator.id, trigger_type, metadata);
    });

    return { orchestratorId: orchestrator.id, cycleId: cycle.id, status: cycle.status };
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

    // Find transactions with checklist items due in the next 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString();
    const { data: urgentItems } = await step.run('find-urgent-deadlines', async () => {
      return supabase
        .from('checklist_items')
        .select('transaction_id')
        .lt('due_date', threeDaysFromNow)
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
          await runOrchestrationCycle(orch.id, 'deadline_approaching', { transaction_id: txnId });
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
