'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole, getCurrentUserProfile } from '@/lib/auth/session';
import * as forecastService from '@/lib/services/forecast-service';

async function getUserOrgId(): Promise<string> {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error('User profile not found');
  const orgId = profile.memberships?.[0]?.organization_id;
  if (!orgId) throw new Error('No organization found');
  return orgId;
}

export async function computeForecastAction(
  forecastMonth: string,
): Promise<{ success?: boolean; data?: any; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { error: 'User profile not found' };

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const forecast = await forecastService.computeForecast(orgId, forecastMonth, profile.id);

    revalidatePath('/broker');
    revalidatePath('/broker/forecast');

    return { success: true, data: forecast };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compute forecast' };
  }
}

export async function getForecastAction(
  month: string,
): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const forecast = await forecastService.getForecast(orgId, month);
    return { data: forecast };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get forecast' };
  }
}

export async function getPipelineSummaryAction(): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['coordinator', 'broker_admin']);

    const summary = await forecastService.getPipelineSummary(orgId);
    return { data: summary };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get pipeline summary' };
  }
}

export async function getConcentrationRiskAction(): Promise<{ data?: any; error?: string }> {
  try {
    await requireAuth();

    const orgId = await getUserOrgId();
    await requireRole(orgId, ['broker_admin']);

    const risk = await forecastService.getConcentrationRisk(orgId);
    return { data: risk };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to get concentration risk' };
  }
}
