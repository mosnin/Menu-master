import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/repositories/automation-trace-events', () => ({
  createTraceEvent: vi.fn(async () => ({})),
}));

const getToolMock = vi.fn();
vi.mock('@/lib/orchestrator/tool-registry', () => ({
  getTool: (...args: unknown[]) => getToolMock(...args),
}));

vi.mock('@/lib/orchestrator/tools', () => ({
  registerAllTools: vi.fn(),
}));

import { executeToolWithPolicy } from '@/lib/services/automation-action-executor';

describe('Shared automation execution convergence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks medium-risk low-confidence workflow actions through shared policy', async () => {
    getToolMock.mockReturnValue({
      execute: vi.fn(async () => ({ success: true, result: { ok: true }, side_effects: [] })),
    });

    const result = await executeToolWithPolicy({
      organizationId: 'org-1',
      sourceSystem: 'workflow',
      toolName: 'create_notification',
      toolParams: {},
      riskClass: 'medium_risk',
      confidence: 0.4,
      entityType: 'transaction',
      entityId: 'txn-1',
      actorRole: 'coordinator',
    });

    expect(result.policyDecision.disposition).toBe('create_approval');
    expect(result.executed).toBe(false);
  });

  it('executes safe orchestrator actions through shared tool layer', async () => {
    const execute = vi.fn(async () => ({ success: true, result: { created: true }, side_effects: [{ type: 'notification', description: 'created' }] }));
    getToolMock.mockReturnValue({ execute });

    const result = await executeToolWithPolicy({
      organizationId: 'org-1',
      sourceSystem: 'orchestrator',
      toolName: 'create_notification',
      toolParams: { transaction_id: 'txn-1' },
      riskClass: 'safe',
      confidence: 0.95,
      entityType: 'transaction',
      entityId: 'txn-1',
      actorRole: 'coordinator',
      orchestratorId: 'orch-1',
      orchestratorCycleId: 'cycle-1',
    });

    expect(result.policyDecision.disposition).toBe('auto_execute');
    expect(result.executed).toBe(true);
    expect(result.success).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
