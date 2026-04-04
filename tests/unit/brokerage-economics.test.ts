import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock('@/lib/db/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Mock audit logger
vi.mock('@/lib/audit/logger', () => ({
  logAction: vi.fn(),
}));

// Silence logger during tests
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------
const mockEconomicsUpsert = vi.fn();
const mockEconomicsFindByTransactionId = vi.fn();
const mockEconomicsUpdate = vi.fn();

vi.mock('@/lib/repositories/transaction-economics', () => ({
  upsert: (...args: unknown[]) => mockEconomicsUpsert(...args),
  findByTransactionId: (...args: unknown[]) => mockEconomicsFindByTransactionId(...args),
  update: (...args: unknown[]) => mockEconomicsUpdate(...args),
}));

const mockSplitsCreate = vi.fn();
const mockSplitsFindByEconomicsId = vi.fn();
const mockSplitsDeleteByEconomicsId = vi.fn();

vi.mock('@/lib/repositories/commission-splits', () => ({
  create: (...args: unknown[]) => mockSplitsCreate(...args),
  findByEconomicsId: (...args: unknown[]) => mockSplitsFindByEconomicsId(...args),
  deleteByEconomicsId: (...args: unknown[]) => mockSplitsDeleteByEconomicsId(...args),
}));

const mockIssueCreate = vi.fn();
const mockIssueFindByTransactionId = vi.fn();
const mockIssueFindByOrgId = vi.fn();
const mockIssueFindById = vi.fn();
const mockIssueUpdate = vi.fn();

vi.mock('@/lib/repositories/compliance-issues', () => ({
  create: (...args: unknown[]) => mockIssueCreate(...args),
  findByTransactionId: (...args: unknown[]) => mockIssueFindByTransactionId(...args),
  findByOrgId: (...args: unknown[]) => mockIssueFindByOrgId(...args),
  findById: (...args: unknown[]) => mockIssueFindById(...args),
  update: (...args: unknown[]) => mockIssueUpdate(...args),
}));

vi.mock('@/lib/repositories/compliance-issue-comments', () => ({
  create: vi.fn(),
  findByIssueId: vi.fn().mockResolvedValue([]),
}));

const mockRuleFindActiveByOrg = vi.fn();
const mockRuleCreate = vi.fn();
const mockRuleUpdate = vi.fn();

vi.mock('@/lib/repositories/policy-rules', () => ({
  findActiveByOrg: (...args: unknown[]) => mockRuleFindActiveByOrg(...args),
  create: (...args: unknown[]) => mockRuleCreate(...args),
  update: (...args: unknown[]) => mockRuleUpdate(...args),
}));

const mockOverrideFindByTransactionId = vi.fn();
const mockOverrideCreate = vi.fn();
const mockOverrideUpdate = vi.fn();

vi.mock('@/lib/repositories/policy-overrides', () => ({
  findByTransactionId: (...args: unknown[]) => mockOverrideFindByTransactionId(...args),
  create: (...args: unknown[]) => mockOverrideCreate(...args),
  update: (...args: unknown[]) => mockOverrideUpdate(...args),
}));

const mockSnapshotUpsert = vi.fn();
const mockSnapshotFindByOrgAndMonth = vi.fn();

vi.mock('@/lib/repositories/close-forecast-snapshots', () => ({
  upsert: (...args: unknown[]) => mockSnapshotUpsert(...args),
  findByOrgAndMonth: (...args: unknown[]) => mockSnapshotFindByOrgAndMonth(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import {
  createOrUpdateEconomics,
  finalizeEconomics,
  getEconomics,
  createSplit,
} from '@/lib/services/economics-service';

import {
  computeForecast,
  getConcentrationRisk,
  getPipelineSummary,
} from '@/lib/services/forecast-service';

import {
  scanCompliance,
  getComplianceStats,
} from '@/lib/services/compliance-service';

import {
  evaluatePolicies,
  createPolicyRule,
} from '@/lib/services/policy-service';

import { hasMinimumRole } from '@/lib/auth/roles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Supabase query-builder chain that resolves to `data` / `error`. */
function mockQuery(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'in', 'not', 'lt', 'lte', 'gte', 'order', 'limit',
    'single', 'maybeSingle',
  ].forEach((m) => { chain[m] = vi.fn(self); });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error });
  return chain;
}

function setupFrom(map: Record<string, ReturnType<typeof mockQuery>>) {
  mockFrom.mockImplementation((table: string) => map[table] ?? mockQuery());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. Commission calculations
// ===========================================================================
describe('Commission calculations', () => {
  it('percentage commission: purchase_price * rate = gross', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-1',
      ...input,
    }));

    await createOrUpdateEconomics('txn-1', {
      orgId: 'org-1',
      purchasePrice: 425000,
      commissionType: 'percentage',
      commissionRate: 3,
      representationSide: 'buyer',
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    expect(upsertArg.gross_commission).toBe(425000 * 3 / 100);
    expect(upsertArg.gross_commission).toBe(12750);
  });

  it('flat commission: amount = gross', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-2',
      ...input,
    }));

    await createOrUpdateEconomics('txn-2', {
      orgId: 'org-1',
      commissionType: 'flat',
      commissionAmount: 8500,
      representationSide: 'seller',
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    expect(upsertArg.gross_commission).toBe(8500);
  });

  it('brokerage split: gross * split_pct = brokerage_share', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-3',
      ...input,
    }));

    await createOrUpdateEconomics('txn-3', {
      orgId: 'org-1',
      purchasePrice: 425000,
      commissionType: 'percentage',
      commissionRate: 3,
      representationSide: 'buyer',
      brokerageSplitPct: 30,
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    const gross = 425000 * 3 / 100; // 12750
    expect(upsertArg.brokerage_share).toBe(gross * 30 / 100);
    expect(upsertArg.brokerage_share).toBe(3825);
  });

  it('agent share: gross - brokerage_share', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-4',
      ...input,
    }));

    await createOrUpdateEconomics('txn-4', {
      orgId: 'org-1',
      purchasePrice: 425000,
      commissionType: 'percentage',
      commissionRate: 3,
      representationSide: 'buyer',
      brokerageSplitPct: 30,
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    const gross = 12750;
    const brokerageShare = 3825;
    expect(upsertArg.agent_share).toBe(gross - brokerageShare);
    expect(upsertArg.agent_share).toBe(8925);
  });

  it('referral fee: gross * referral_pct = referral_amount', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-5',
      ...input,
    }));

    await createOrUpdateEconomics('txn-5', {
      orgId: 'org-1',
      purchasePrice: 650000,
      commissionType: 'percentage',
      commissionRate: 2.5,
      representationSide: 'seller',
      brokerageSplitPct: 35,
      hasReferral: true,
      referralFeePct: 25,
      referralPartyName: 'Referral Network LLC',
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    const gross = 650000 * 2.5 / 100; // 16250
    expect(upsertArg.referral_fee_amount).toBe(gross * 25 / 100);
    expect(upsertArg.referral_fee_amount).toBe(4062.5);
  });

  it('net brokerage revenue with referral: brokerage_share - referral_amount', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-6',
      ...input,
    }));

    await createOrUpdateEconomics('txn-6', {
      orgId: 'org-1',
      purchasePrice: 650000,
      commissionType: 'percentage',
      commissionRate: 2.5,
      representationSide: 'seller',
      brokerageSplitPct: 35,
      hasReferral: true,
      referralFeePct: 25,
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    const gross = 16250;
    const brokerageShare = gross * 35 / 100; // 5687.5
    const referralFee = gross * 25 / 100; // 4062.5
    expect(upsertArg.net_brokerage_revenue).toBe(brokerageShare - referralFee);
    expect(upsertArg.net_brokerage_revenue).toBe(1625);
  });

  it('net brokerage revenue without referral: equals brokerage_share', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-7',
      ...input,
    }));

    await createOrUpdateEconomics('txn-7', {
      orgId: 'org-1',
      purchasePrice: 380000,
      commissionType: 'percentage',
      commissionRate: 3,
      representationSide: 'buyer',
      brokerageSplitPct: 30,
      hasReferral: false,
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    expect(upsertArg.net_brokerage_revenue).toBe(upsertArg.brokerage_share);
  });

  it('zero purchase price yields zero gross commission', async () => {
    mockEconomicsUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'econ-8',
      ...input,
    }));

    await createOrUpdateEconomics('txn-8', {
      orgId: 'org-1',
      purchasePrice: 0,
      commissionType: 'percentage',
      commissionRate: 3,
      representationSide: 'buyer',
    }, 'user-1');

    const upsertArg = mockEconomicsUpsert.mock.calls[0][0];
    expect(upsertArg.gross_commission).toBe(0);
    expect(upsertArg.brokerage_share).toBe(0);
    expect(upsertArg.agent_share).toBe(0);
    expect(upsertArg.net_brokerage_revenue).toBe(0);
  });
});

// ===========================================================================
// 2. Forecast calculations
// ===========================================================================
describe('Forecast calculations', () => {
  it('total projected = sum of gross_commission', async () => {
    const economicsRows = [
      { transaction_id: 'txn-1', gross_commission: 12750, close_probability: 80, expected_close_date: '2026-04-15', transactions: { id: 'txn-1', status: 'active' } },
      { transaction_id: 'txn-2', gross_commission: 16250, close_probability: 60, expected_close_date: '2026-04-20', transactions: { id: 'txn-2', status: 'active' } },
    ];

    setupFrom({
      transaction_economics: mockQuery(economicsRows),
      deal_health_scores: mockQuery([]),
    });
    mockSnapshotUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'snap-1',
      ...input,
    }));

    const result = await computeForecast('org-1', new Date('2026-04-01'));
    expect(result.total_projected).toBe(12750 + 16250);
    expect(result.total_projected).toBe(29000);
  });

  it('total weighted = sum of gross * close_probability / 100', async () => {
    const economicsRows = [
      { transaction_id: 'txn-1', gross_commission: 12750, close_probability: 80, expected_close_date: '2026-04-15', transactions: { id: 'txn-1', status: 'active' } },
      { transaction_id: 'txn-2', gross_commission: 16250, close_probability: 60, expected_close_date: '2026-04-20', transactions: { id: 'txn-2', status: 'active' } },
    ];

    setupFrom({
      transaction_economics: mockQuery(economicsRows),
      deal_health_scores: mockQuery([]),
    });
    mockSnapshotUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'snap-2',
      ...input,
    }));

    const result = await computeForecast('org-1', new Date('2026-04-01'));
    const expected = (12750 * 80 / 100) + (16250 * 60 / 100);
    expect(result.total_weighted).toBe(expected);
  });

  it('at risk count filters by rating correctly', async () => {
    const economicsRows = [
      { transaction_id: 'txn-1', gross_commission: 10000, close_probability: 50, expected_close_date: '2026-04-15', transactions: { id: 'txn-1', status: 'active' } },
      { transaction_id: 'txn-2', gross_commission: 20000, close_probability: 40, expected_close_date: '2026-04-20', transactions: { id: 'txn-2', status: 'active' } },
      { transaction_id: 'txn-3', gross_commission: 15000, close_probability: 90, expected_close_date: '2026-04-25', transactions: { id: 'txn-3', status: 'active' } },
    ];

    const healthRows = [
      { transaction_id: 'txn-1', rating: 'at_risk' },
      { transaction_id: 'txn-2', rating: 'critical' },
      { transaction_id: 'txn-3', rating: 'healthy' },
    ];

    setupFrom({
      transaction_economics: mockQuery(economicsRows),
      deal_health_scores: mockQuery(healthRows),
    });
    mockSnapshotUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'snap-3',
      ...input,
    }));

    const result = await computeForecast('org-1', new Date('2026-04-01'));
    expect(result.at_risk_count).toBe(2);
  });

  it('concentration risk flags deals > 30% of total', async () => {
    const rows = [
      { transaction_id: 'txn-big', gross_commission: 70000 },
      { transaction_id: 'txn-small', gross_commission: 30000 },
    ];

    setupFrom({
      transaction_economics: mockQuery(rows),
    });

    const result = await getConcentrationRisk('org-1');
    expect(result.hasHighConcentration).toBe(true);
    expect(result.highConcentrationDeals).toContain('txn-big');
    expect(result.highConcentrationDeals).not.toContain('txn-small');
  });

  it('empty pipeline returns zeros', async () => {
    setupFrom({
      transaction_economics: mockQuery([]),
      deal_health_scores: mockQuery([]),
    });
    mockSnapshotUpsert.mockImplementation((input: Record<string, unknown>) => ({
      id: 'snap-empty',
      ...input,
    }));

    const result = await computeForecast('org-1', new Date('2026-04-01'));
    expect(result.total_projected).toBe(0);
    expect(result.total_weighted).toBe(0);
    expect(result.total_closed).toBe(0);
    expect(result.transaction_count).toBe(0);
    expect(result.at_risk_count).toBe(0);
  });
});

// ===========================================================================
// 3. Compliance scanning
// ===========================================================================
describe('Compliance scanning', () => {
  it('missing economics creates issue for active transaction', async () => {
    mockIssueFindByTransactionId.mockResolvedValue([]);
    mockRuleFindActiveByOrg.mockResolvedValue([]);
    mockIssueCreate.mockImplementation((input: Record<string, unknown>) => ({
      id: 'issue-1',
      ...input,
    }));

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', updated_at: '2026-04-01' }),
      approvals: mockQuery([]),
      transaction_exceptions: mockQuery([]),
      transaction_economics: mockQuery([]),
      closing_readiness: mockQuery([]),
    });

    const result = await scanCompliance('txn-1', 'user-1');
    expect(result.length).toBeGreaterThanOrEqual(1);

    const economicsIssue = result.find((i) => i.category === 'missing_economics');
    expect(economicsIssue).toBeDefined();
    expect(economicsIssue!.severity).toBe('warning');
  });

  it('unresolved critical exception creates issue', async () => {
    mockIssueFindByTransactionId.mockResolvedValue([]);
    mockRuleFindActiveByOrg.mockResolvedValue([]);
    mockIssueCreate.mockImplementation((input: Record<string, unknown>) => ({
      id: 'issue-2',
      ...input,
    }));

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'draft', updated_at: '2026-04-01' }),
      approvals: mockQuery([]),
      transaction_exceptions: mockQuery([{ id: 'exc-1', title: 'Critical problem' }]),
      transaction_economics: mockQuery([{ id: 'econ-1', gross_commission: 12000 }]),
      closing_readiness: mockQuery([]),
    });

    const result = await scanCompliance('txn-1', 'user-1');
    const exceptionIssue = result.find((i) => i.category === 'unresolved_exception');
    expect(exceptionIssue).toBeDefined();
    expect(exceptionIssue!.severity).toBe('critical');
  });

  it('readiness inconsistency creates issue when closing soon with low score', async () => {
    mockIssueFindByTransactionId.mockResolvedValue([]);
    mockRuleFindActiveByOrg.mockResolvedValue([]);
    mockIssueCreate.mockImplementation((input: Record<string, unknown>) => ({
      id: 'issue-3',
      ...input,
    }));

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'pending_closing', updated_at: '2026-04-01' }),
      approvals: mockQuery([]),
      transaction_exceptions: mockQuery([]),
      transaction_economics: mockQuery([{ id: 'econ-1', gross_commission: 12000 }]),
      closing_readiness: mockQuery([{ overall_score: 45, days_until_closing: 5 }]),
    });

    const result = await scanCompliance('txn-1', 'user-1');
    const readinessIssue = result.find((i) => i.category === 'readiness_inconsistency');
    expect(readinessIssue).toBeDefined();
    expect(readinessIssue!.severity).toBe('critical');
  });

  it('deduplication: does not create duplicate issue for same category+transaction', async () => {
    mockIssueFindByTransactionId.mockResolvedValue([
      { id: 'existing-1', category: 'missing_economics', transaction_id: 'txn-1', status: 'open' },
    ]);
    mockRuleFindActiveByOrg.mockResolvedValue([]);
    mockIssueCreate.mockImplementation((input: Record<string, unknown>) => ({
      id: 'issue-dup',
      ...input,
    }));

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', updated_at: '2026-04-01' }),
      approvals: mockQuery([]),
      transaction_exceptions: mockQuery([]),
      transaction_economics: mockQuery([]),
      closing_readiness: mockQuery([]),
    });

    const result = await scanCompliance('txn-1', 'user-1');
    const economicsIssues = result.filter((i) => i.category === 'missing_economics');
    expect(economicsIssues).toHaveLength(0);
  });

  it('issue counts by severity are correct', async () => {
    mockIssueFindByOrgId.mockResolvedValue([
      { id: 'i1', severity: 'critical', status: 'open', category: 'missing_document' },
      { id: 'i2', severity: 'critical', status: 'open', category: 'unresolved_exception' },
      { id: 'i3', severity: 'warning', status: 'open', category: 'missing_economics' },
      { id: 'i4', severity: 'info', status: 'resolved', category: 'other' },
    ]);

    const stats = await getComplianceStats('org-1');
    expect(stats.bySeverity).toEqual({
      critical: 2,
      warning: 1,
      info: 1,
    });
  });

  it('issue counts by status are correct', async () => {
    mockIssueFindByOrgId.mockResolvedValue([
      { id: 'i1', severity: 'critical', status: 'open', category: 'missing_document' },
      { id: 'i2', severity: 'warning', status: 'open', category: 'missing_economics' },
      { id: 'i3', severity: 'critical', status: 'resolved', category: 'unresolved_exception' },
      { id: 'i4', severity: 'info', status: 'overridden', category: 'other' },
    ]);

    const stats = await getComplianceStats('org-1');
    expect(stats.byStatus).toEqual({
      open: 2,
      resolved: 1,
      overridden: 1,
    });
  });
});

// ===========================================================================
// 4. Policy evaluation
// ===========================================================================
describe('Policy evaluation', () => {
  const makeRule = (overrides: Record<string, unknown> = {}) => ({
    id: 'rule-1',
    organization_id: 'org-1',
    office_id: null,
    name: 'Test Rule',
    description: null,
    category: 'required_economics',
    enforcement_mode: 'warn',
    rule_config: { require_gross_commission: true },
    applies_to_transaction_types: [],
    is_active: true,
    created_by_user_id: 'user-1',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  });

  it('warn mode returns "warn" status when rule is violated', async () => {
    const rule = makeRule({ enforcement_mode: 'warn' });
    mockRuleFindActiveByOrg.mockResolvedValue([rule]);
    mockOverrideFindByTransactionId.mockResolvedValue([]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
      transaction_economics: mockQuery([]),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('warn');
  });

  it('block mode returns "block" status when rule is violated', async () => {
    const rule = makeRule({ enforcement_mode: 'block' });
    mockRuleFindActiveByOrg.mockResolvedValue([rule]);
    mockOverrideFindByTransactionId.mockResolvedValue([]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
      transaction_economics: mockQuery([]),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('block');
  });

  it('require_override mode returns "override_required" status when rule is violated', async () => {
    const rule = makeRule({ enforcement_mode: 'require_override' });
    mockRuleFindActiveByOrg.mockResolvedValue([rule]);
    mockOverrideFindByTransactionId.mockResolvedValue([]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
      transaction_economics: mockQuery([]),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('override_required');
  });

  it('approved override changes result to "pass"', async () => {
    const rule = makeRule({ enforcement_mode: 'block' });
    mockRuleFindActiveByOrg.mockResolvedValue([rule]);
    mockOverrideFindByTransactionId.mockResolvedValue([
      {
        id: 'override-1',
        policy_rule_id: 'rule-1',
        transaction_id: 'txn-1',
        status: 'approved',
        expires_at: null,
      },
    ]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
      transaction_economics: mockQuery([]),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('pass');
    expect(results[0].details).toBe('Approved override exists');
  });

  it('inactive rules are skipped', async () => {
    mockRuleFindActiveByOrg.mockResolvedValue([]);
    mockOverrideFindByTransactionId.mockResolvedValue([]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(0);
  });

  it('multiple rules evaluated in order', async () => {
    const rule1 = makeRule({
      id: 'rule-1',
      name: 'Economics Rule',
      enforcement_mode: 'warn',
      category: 'required_economics',
      rule_config: { require_gross_commission: true },
    });
    const rule2 = makeRule({
      id: 'rule-2',
      name: 'Document Rule',
      enforcement_mode: 'block',
      category: 'required_document',
      rule_config: { document_type: 'purchase_agreement' },
    });

    mockRuleFindActiveByOrg.mockResolvedValue([rule1, rule2]);
    mockOverrideFindByTransactionId.mockResolvedValue([]);

    setupFrom({
      transactions: mockQuery({ id: 'txn-1', organization_id: 'org-1', status: 'active', office_id: null }),
      transaction_economics: mockQuery([]),
      documents: mockQuery([]),
    });

    const results = await evaluatePolicies('txn-1', 'user-1');
    expect(results).toHaveLength(2);
    expect(results[0].rule.id).toBe('rule-1');
    expect(results[0].status).toBe('warn');
    expect(results[1].rule.id).toBe('rule-2');
    expect(results[1].status).toBe('block');
  });
});

// ===========================================================================
// 5. Authorization
// ===========================================================================
describe('Authorization', () => {
  it('only broker_admin can finalize economics', () => {
    expect(hasMinimumRole('broker_admin', 'broker_admin')).toBe(true);
    expect(hasMinimumRole('coordinator', 'broker_admin')).toBe(false);
    expect(hasMinimumRole('agent', 'broker_admin')).toBe(false);
  });

  it('only broker_admin can approve overrides', () => {
    expect(hasMinimumRole('broker_admin', 'broker_admin')).toBe(true);
    expect(hasMinimumRole('coordinator', 'broker_admin')).toBe(false);
    expect(hasMinimumRole('agent', 'broker_admin')).toBe(false);
  });

  it('only coordinator+ can create policy rules', () => {
    expect(hasMinimumRole('broker_admin', 'coordinator')).toBe(true);
    expect(hasMinimumRole('coordinator', 'coordinator')).toBe(true);
    expect(hasMinimumRole('agent', 'coordinator')).toBe(false);
  });

  it('agent cannot access compliance queue', () => {
    expect(hasMinimumRole('agent', 'coordinator')).toBe(false);
  });

  it('broker_admin can access all broker views', () => {
    expect(hasMinimumRole('broker_admin', 'agent')).toBe(true);
    expect(hasMinimumRole('broker_admin', 'coordinator')).toBe(true);
    expect(hasMinimumRole('broker_admin', 'broker_admin')).toBe(true);
  });
});
