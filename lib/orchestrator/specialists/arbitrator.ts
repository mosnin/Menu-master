import type {
  SpecialistOutput,
  SpecialistFinding,
  SpecialistRecommendation,
} from './types';

// ---------------------------------------------------------------------------
// Arbitrator – merges specialist outputs into a unified recommendation
// ---------------------------------------------------------------------------

export interface ArbitrationResult {
  merged_recommendations: SpecialistRecommendation[];
  conflicts: ArbitrationConflict[];
  escalations: string[];
  operator_summary: string;
}

export interface ArbitrationConflict {
  specialist_a: string;
  specialist_b: string;
  description: string;
  resolution: string;
}

const MAX_MERGED_RECOMMENDATIONS = 10;

/**
 * Arbitrate across specialist outputs to produce a single coherent set of
 * recommendations.
 *
 * Rules:
 * 1. Deduplicate recommendations by tool_name – keep the higher-confidence one.
 * 2. Detect conflicts (one specialist recommends an action while another blocks
 *    it) and default to the more cautious position.
 * 3. Compliance specialist findings always take precedence.
 * 4. Merge escalations from all specialists.
 * 5. Build a combined operator summary.
 * 6. Cap merged recommendations at MAX_MERGED_RECOMMENDATIONS.
 */
export function arbitrate(outputs: SpecialistOutput[]): ArbitrationResult {
  const conflicts: ArbitrationConflict[] = [];
  const escalations: string[] = [];
  const summaryParts: string[] = [];

  // Collect all findings and recommendations, tagging source role
  const taggedRecommendations: (SpecialistRecommendation & { _source: string })[] = [];
  const blockedToolNames = new Set<string>();

  // First pass – gather blocked tool names from all specialists' findings
  for (const output of outputs) {
    for (const finding of output.findings) {
      for (const blockedReason of finding.blocked_reasons) {
        // Extract tool names mentioned in blocked reasons
        for (const rec of finding.recommended_actions) {
          // If a finding blocks something, track it
          blockedToolNames.add(rec.tool_name);
        }
      }
    }
  }

  // Compliance specialist findings always take precedence: collect their blocks
  const complianceOutputs = outputs.filter(o => o.role === 'compliance');
  const complianceBlockedTools = new Set<string>();

  for (const compOutput of complianceOutputs) {
    for (const finding of compOutput.findings) {
      if (finding.severity === 'critical' || finding.severity === 'warning') {
        for (const reason of finding.blocked_reasons) {
          // Any recommendation from other specialists that matches a blocked
          // reason from compliance should be suppressed
          complianceBlockedTools.add(reason);
        }
      }
      // Compliance escalation needs
      if (finding.severity === 'critical') {
        escalations.push(
          `[compliance] ${finding.summary}`,
        );
      }
    }
  }

  // Second pass – collect recommendations
  for (const output of outputs) {
    // Merge escalations from operator summary if findings are critical
    for (const finding of output.findings) {
      if (finding.severity === 'critical') {
        escalations.push(`[${output.role}] ${finding.summary}`);
      }
    }

    for (const finding of output.findings) {
      for (const rec of finding.recommended_actions) {
        taggedRecommendations.push({ ...rec, _source: output.role });
      }
    }

    if (output.operator_summary) {
      summaryParts.push(`[${output.role}] ${output.operator_summary}`);
    }
  }

  // Deduplicate by tool_name – keep higher confidence, but compliance wins ties
  const deduped = new Map<string, SpecialistRecommendation & { _source: string }>();

  for (const rec of taggedRecommendations) {
    const existing = deduped.get(rec.tool_name);
    if (!existing) {
      deduped.set(rec.tool_name, rec);
    } else {
      // Compliance always wins
      if (rec._source === 'compliance' && existing._source !== 'compliance') {
        deduped.set(rec.tool_name, rec);
      } else if (existing._source === 'compliance' && rec._source !== 'compliance') {
        // Keep existing compliance recommendation
      } else if (rec.confidence > existing.confidence) {
        deduped.set(rec.tool_name, rec);
      }
    }
  }

  // Detect conflicts: one specialist recommends a tool, another has findings
  // that block it
  const recommendingByTool = new Map<string, string[]>();
  for (const rec of taggedRecommendations) {
    const existing = recommendingByTool.get(rec.tool_name) ?? [];
    if (!existing.includes(rec._source)) {
      existing.push(rec._source);
    }
    recommendingByTool.set(rec.tool_name, existing);
  }

  // Check for blocking conflicts
  for (const output of outputs) {
    for (const finding of output.findings) {
      for (const blockedReason of finding.blocked_reasons) {
        // Check if any other specialist recommended a tool that this one blocks
        for (const [toolName, sources] of recommendingByTool.entries()) {
          if (
            blockedReason.toLowerCase().includes(toolName.toLowerCase()) ||
            toolName.toLowerCase().includes(blockedReason.toLowerCase())
          ) {
            const otherSources = sources.filter(s => s !== output.role);
            for (const otherSource of otherSources) {
              conflicts.push({
                specialist_a: otherSource,
                specialist_b: output.role,
                description: `${otherSource} recommends "${toolName}" but ${output.role} blocks it: ${blockedReason}`,
                resolution: `Defaulting to cautious position (${output.role}). Tool "${toolName}" suppressed.`,
              });
              // Remove the conflicted tool – default to cautious
              deduped.delete(toolName);
            }
          }
        }
      }
    }
  }

  // Remove anything compliance explicitly blocked
  for (const blocked of complianceBlockedTools) {
    for (const [toolName] of deduped) {
      if (
        blocked.toLowerCase().includes(toolName.toLowerCase()) ||
        toolName.toLowerCase().includes(blocked.toLowerCase())
      ) {
        deduped.delete(toolName);
      }
    }
  }

  // Build final merged recommendations (strip internal _source tag)
  const merged: SpecialistRecommendation[] = [];
  for (const [, rec] of deduped) {
    const { _source: _, ...clean } = rec;
    merged.push(clean);
    if (merged.length >= MAX_MERGED_RECOMMENDATIONS) break;
  }

  // Sort by urgency then confidence
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  merged.sort((a, b) => {
    const urgDiff = (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3);
    if (urgDiff !== 0) return urgDiff;
    return b.confidence - a.confidence;
  });

  // Deduplicate escalations
  const uniqueEscalations = [...new Set(escalations)];

  const operatorSummary =
    summaryParts.length > 0
      ? summaryParts.join(' | ')
      : 'No specialist findings to report.';

  return {
    merged_recommendations: merged,
    conflicts,
    escalations: uniqueEscalations,
    operator_summary: operatorSummary,
  };
}
