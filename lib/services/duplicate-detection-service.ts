import { supabase } from '@/lib/db/client';
import * as duplicateCandidateRepo from '@/lib/repositories/duplicate-candidates';
import { logAction } from '@/lib/audit/logger';
import type { DuplicateCandidate } from '@/types';

// Similarity thresholds
const CONTACT_THRESHOLD = 0.7;
const TRANSACTION_THRESHOLD = 0.8;

function normalizeString(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function calculateSimilarity(a: string, b: string): number {
  const na = normalizeString(a);
  const nb = normalizeString(b);
  if (na === nb) return 1;

  // Simple Dice coefficient on bigrams
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.slice(i, i + 2));
  for (let i = 0; i < nb.length - 1; i++) bigramsB.add(nb.slice(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size) || 0;
}

export async function detectContactDuplicates(
  orgId: string,
): Promise<DuplicateCandidate[]> {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, full_name, email')
    .eq('organization_id', orgId);

  if (!contacts || contacts.length < 2) return [];

  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];

      const matchFields: Record<string, unknown>[] = [];
      let maxScore = 0;

      // Name similarity
      const nameSim = calculateSimilarity(a.full_name, b.full_name);
      if (nameSim > CONTACT_THRESHOLD) {
        matchFields.push({ field: 'full_name', score: nameSim });
        maxScore = Math.max(maxScore, nameSim);
      }

      // Exact email match
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        matchFields.push({ field: 'email', score: 1.0 });
        maxScore = 1.0;
      }

      if (maxScore >= CONTACT_THRESHOLD) {
        try {
          const candidate = await duplicateCandidateRepo.create({
            organization_id: orgId,
            entity_type: 'contact',
            entity_a_id: a.id,
            entity_b_id: b.id,
            similarity_score: maxScore,
            match_fields: matchFields,
            resolution: 'pending',
            resolved_by_user_id: null,
            resolved_at: null,
          });
          candidates.push(candidate);
        } catch {
          // Unique constraint violation — already detected
        }
      }
    }
  }

  if (candidates.length > 0) {
    await logAction({
      organizationId: orgId,
      actorType: 'system',
      action: 'duplicate.detected',
      targetType: 'contact',
      metadata: { count: candidates.length },
    });
  }

  return candidates;
}

export async function detectTransactionDuplicates(
  orgId: string,
): Promise<DuplicateCandidate[]> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, title')
    .eq('organization_id', orgId);

  if (!transactions || transactions.length < 2) return [];

  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];

      const titleSim = calculateSimilarity(a.title, b.title);
      if (titleSim >= TRANSACTION_THRESHOLD) {
        try {
          const candidate = await duplicateCandidateRepo.create({
            organization_id: orgId,
            entity_type: 'transaction',
            entity_a_id: a.id,
            entity_b_id: b.id,
            similarity_score: titleSim,
            match_fields: [{ field: 'title', score: titleSim }],
            resolution: 'pending',
            resolved_by_user_id: null,
            resolved_at: null,
          });
          candidates.push(candidate);
        } catch {
          // Already detected
        }
      }
    }
  }

  if (candidates.length > 0) {
    await logAction({
      organizationId: orgId,
      actorType: 'system',
      action: 'duplicate.detected',
      targetType: 'transaction',
      metadata: { count: candidates.length },
    });
  }

  return candidates;
}

export async function resolveDuplicate(
  candidateId: string,
  resolution: 'merged' | 'not_duplicate' | 'ignored',
  userId: string,
): Promise<DuplicateCandidate> {
  const result = await duplicateCandidateRepo.resolve(candidateId, resolution, userId);

  await logAction({
    organizationId: result.organization_id,
    actorType: 'user',
    actorUserId: userId,
    action: 'duplicate.resolved',
    targetType: 'duplicate_candidate',
    targetId: candidateId,
    metadata: { resolution },
  });

  return result;
}

export async function getPendingDuplicates(
  orgId: string,
  entityType?: string,
): Promise<DuplicateCandidate[]> {
  return duplicateCandidateRepo.findByOrgId(orgId, {
    entityType,
    resolution: 'pending',
    limit: 50,
  });
}

export async function getPendingDuplicateCount(orgId: string): Promise<number> {
  return duplicateCandidateRepo.countPending(orgId);
}

// Re-export for testing
export { calculateSimilarity, CONTACT_THRESHOLD, TRANSACTION_THRESHOLD };
