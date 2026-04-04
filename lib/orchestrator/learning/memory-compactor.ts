import * as MemoryRepo from '@/lib/repositories/orchestrator-memory';
import * as MemorySummaryRepo from '@/lib/repositories/orchestrator-memory-summaries';
import * as LearningEventRepo from '@/lib/repositories/orchestrator-learning-events';
import type { OrchestratorMemoryEntry, MemorySummaryType } from '@/types';

// Configuration
const MIN_PATTERN_COUNT = 3; // Minimum occurrences to form a pattern
const COMPACTION_WINDOW_DAYS = 30; // Look back window for compaction
const MAX_ACTIVE_SUMMARIES = 20; // Max active summaries per orchestrator
const RELEVANCE_DECAY_FACTOR = 0.9; // How quickly old summaries lose relevance

/**
 * Run memory compaction for an orchestrator.
 * Groups repeated patterns, creates summaries, marks source entries as resolved.
 */
export async function compactMemory(
  organizationId: string,
  orchestratorId: string,
): Promise<{ summariesCreated: number; memoriesCompacted: number }> {
  // Use findRecent with a large limit to get all memory for compaction
  const allMemory = await MemoryRepo.findRecent(orchestratorId, 200);

  const cutoff = new Date(Date.now() - COMPACTION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const recentMemory = allMemory.filter((m: OrchestratorMemoryEntry) => m.created_at >= cutoff);

  let summariesCreated = 0;
  let memoriesCompacted = 0;

  // Group by memory_type and detect patterns
  const groups = groupMemoryByType(recentMemory);

  for (const [memoryType, entries] of Object.entries(groups)) {
    const patterns = detectPatterns(entries);

    for (const pattern of patterns) {
      if (pattern.count < MIN_PATTERN_COUNT) continue;

      const summaryType = mapMemoryTypeToSummaryType(memoryType);
      if (!summaryType) continue;

      await MemorySummaryRepo.create({
        organization_id: organizationId,
        orchestrator_id: orchestratorId,
        summary_type: summaryType,
        summary: pattern.summary,
        pattern_count: pattern.count,
        source_memory_ids: pattern.sourceIds,
        relevance_score: calculateRelevance(pattern.count, pattern.recency),
        is_active: true,
        covers_from: pattern.from,
        covers_to: pattern.to,
      });
      summariesCreated++;

      // Mark source memories as resolved (they're now captured in summary)
      for (const id of pattern.sourceIds) {
        await MemoryRepo.resolve(id);
        memoriesCompacted++;
      }
    }
  }

  // Prune old summaries if we exceed the limit
  await pruneOldSummaries(orchestratorId);

  // Log the compaction event
  await LearningEventRepo.create({
    organization_id: organizationId,
    orchestrator_id: orchestratorId,
    event_type: 'memory_compacted',
    detail: { summaries_created: summariesCreated, memories_compacted: memoriesCompacted },
    influenced_entity: null,
    influenced_entity_id: null,
  });

  return { summariesCreated, memoriesCompacted };
}

/**
 * Get enriched memory for planning - combines raw recent memory with active summaries.
 */
export async function getEnrichedMemory(
  orchestratorId: string,
  rawLimit = 15,
  summaryLimit = 10,
): Promise<{
  recentMemory: OrchestratorMemoryEntry[];
  summaries: { type: string; summary: string; pattern_count: number; relevance_score: number }[];
}> {
  const [recentMemory, summaries] = await Promise.all([
    MemoryRepo.findRecent(orchestratorId, rawLimit),
    MemorySummaryRepo.findByOrchestrator(orchestratorId, true, summaryLimit),
  ]);

  return {
    recentMemory,
    summaries: summaries.map(s => ({
      type: s.summary_type,
      summary: s.summary,
      pattern_count: s.pattern_count,
      relevance_score: s.relevance_score,
    })),
  };
}

/**
 * Decay relevance scores for existing summaries.
 * Called periodically to ensure old patterns don't dominate.
 */
export async function decayRelevance(orchestratorId: string): Promise<void> {
  const summaries = await MemorySummaryRepo.findByOrchestrator(orchestratorId, true, 100);

  for (const summary of summaries) {
    const newRelevance = Math.max(0.1, summary.relevance_score * RELEVANCE_DECAY_FACTOR);
    if (newRelevance < 0.15) {
      // Deactivate very low relevance summaries
      await MemorySummaryRepo.deactivate(summary.id);
    }
    // Note: we'd need an update function for relevance; for now decay is tracked at compaction time
  }
}

// ---- Internal helpers ----

interface DetectedPattern {
  summary: string;
  count: number;
  sourceIds: string[];
  from: string;
  to: string;
  recency: number; // 0-1, how recent the pattern is
}

function groupMemoryByType(memories: OrchestratorMemoryEntry[]): Record<string, OrchestratorMemoryEntry[]> {
  const groups: Record<string, OrchestratorMemoryEntry[]> = {};
  for (const m of memories) {
    if (!groups[m.memory_type]) groups[m.memory_type] = [];
    groups[m.memory_type].push(m);
  }
  return groups;
}

function detectPatterns(entries: OrchestratorMemoryEntry[]): DetectedPattern[] {
  // Group by similarity in summary text (simple keyword matching)
  const buckets = new Map<string, OrchestratorMemoryEntry[]>();

  for (const entry of entries) {
    const key = extractPatternKey(entry);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(entry);
  }

  const patterns: DetectedPattern[] = [];

  for (const [key, group] of buckets) {
    if (group.length < MIN_PATTERN_COUNT) continue;

    const sorted = group.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const newest = sorted[sorted.length - 1];
    const daysSinceNewest = (Date.now() - new Date(newest.created_at).getTime()) / (1000 * 60 * 60 * 24);

    patterns.push({
      summary: `Repeated pattern (${group.length}x): ${key}. Latest: ${newest.summary}`,
      count: group.length,
      sourceIds: group.map(g => g.id),
      from: sorted[0].created_at,
      to: newest.created_at,
      recency: Math.max(0, 1 - daysSinceNewest / COMPACTION_WINDOW_DAYS),
    });
  }

  return patterns;
}

function extractPatternKey(entry: OrchestratorMemoryEntry): string {
  // Extract a normalized key from the memory entry for grouping
  const details = entry.details ?? {};

  // Use tool_name if available (most common for action patterns)
  if (details.tool_name) return `${entry.memory_type}:${details.tool_name}`;

  // Use category if available (for corrections)
  if (details.category) return `${entry.memory_type}:${details.category}`;

  // Use counterparty_type if available
  if (details.counterparty_type) return `${entry.memory_type}:${details.counterparty_type}`;

  // Fall back to first few words of summary
  const words = entry.summary.split(' ').slice(0, 4).join(' ').toLowerCase();
  return `${entry.memory_type}:${words}`;
}

function mapMemoryTypeToSummaryType(memoryType: string): MemorySummaryType | null {
  const map: Record<string, MemorySummaryType> = {
    action_taken: 'action_pattern',
    blocker: 'blocker_pattern',
    recommendation_outcome: 'successful_resolution',
    failure_pattern: 'recovery_pattern',
    counterparty_signal: 'counterparty_pattern',
    human_correction: 'correction_pattern',
    recommendation_given: 'ignored_action_pattern',
  };
  return map[memoryType] ?? null;
}

function calculateRelevance(count: number, recency: number): number {
  // Higher count + more recent = more relevant
  const countScore = Math.min(1, count / 10); // saturates at 10 occurrences
  return Math.min(1, countScore * 0.6 + recency * 0.4);
}

async function pruneOldSummaries(orchestratorId: string): Promise<void> {
  const all = await MemorySummaryRepo.findByOrchestrator(orchestratorId, true, 100);
  if (all.length <= MAX_ACTIVE_SUMMARIES) return;

  // Sort by relevance, deactivate the least relevant
  const sorted = [...all].sort((a, b) => a.relevance_score - b.relevance_score);
  const toDeactivate = sorted.slice(0, all.length - MAX_ACTIVE_SUMMARIES);

  for (const summary of toDeactivate) {
    await MemorySummaryRepo.deactivate(summary.id);
  }
}
