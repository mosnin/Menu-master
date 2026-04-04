'use server';

import { requireAuth } from '@/lib/auth/session';

export type HealthRating = 'healthy' | 'watch' | 'at_risk' | 'critical';

export interface HealthSummary {
  healthy: number;
  watch: number;
  at_risk: number;
  critical: number;
}

export interface ClosingSoonTransaction {
  id: string;
  name: string;
  property_address?: string;
  closing_date: string;
  readiness: 'ready' | 'blocked' | 'at_risk' | 'unknown';
  days_until_close: number;
}

export async function getHealthSummaryAction(): Promise<{
  data?: HealthSummary;
  error?: string;
}> {
  try {
    await requireAuth();
    // TODO: Aggregate from transaction_health_scores table
    return {
      data: {
        healthy: 0,
        watch: 0,
        at_risk: 0,
        critical: 0,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load health summary' };
  }
}

export async function getClosingSoonAction(): Promise<{
  data?: ClosingSoonTransaction[];
  error?: string;
}> {
  try {
    await requireAuth();
    // TODO: Query transactions with closing_date within 7 days
    return { data: [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load closing soon transactions' };
  }
}
