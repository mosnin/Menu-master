import { getOpenAIClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';
import type { AgentNodeDefinition, AgentNodeResult, AgentNodeType } from './types';
import { getAgentNodeDefinition } from './registry';
import type { FailureFallback } from './types';
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  validateAgentOutput,
  estimateCostCents,
  applyScopeFilter,
  DEFAULT_SAFETY,
} from './safety';

export async function executeAgentNode(
  agentType: AgentNodeType,
  input: Record<string, unknown>,
  workflowContext: Record<string, unknown>,
): Promise<AgentNodeResult> {
  const startTime = Date.now();
  const definition = getAgentNodeDefinition(agentType);

  if (!definition) {
    return {
      success: false,
      output: { error: `Unknown agent node type: ${agentType}` },
      token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: 'none',
      latency_ms: Date.now() - startTime,
      retries_used: 0,
      confidence: null,
      safety_flags: ['execution_failed'],
      truncated: false,
      fallback_used: null,
    };
  }

  // Circuit breaker check
  if (isCircuitOpen(agentType)) {
    return applyFallback(definition, startTime, `Circuit breaker open for ${agentType}. Too many recent failures.`);
  }

  const safety = { ...DEFAULT_SAFETY, ...definition.safety };
  const client = getOpenAIClient();

  if (!client) {
    // Mock fallback
    return makeMockResult(definition, input, startTime);
  }

  // Apply memory scope filtering
  const scopedContext = applyScopeFilter(sanitizeContext(workflowContext), safety.memory_scope);

  let retries = 0;
  while (retries <= safety.max_retries) {
    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: safety.max_tokens,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: buildSystemPrompt(definition, safety),
            },
            {
              role: 'user',
              content: JSON.stringify({
                input,
                context: scopedContext,
              }),
            },
          ],
        }),
        timeoutPromise(safety.timeout_ms),
      ]);

      const content = response.choices[0]?.message?.content ?? '{}';
      let output: Record<string, unknown>;
      try {
        output = JSON.parse(content);
      } catch {
        output = { raw_response: content, parse_error: true };
      }

      const tokenUsage = {
        prompt_tokens: response.usage?.prompt_tokens ?? 0,
        completion_tokens: response.usage?.completion_tokens ?? 0,
        total_tokens: response.usage?.total_tokens ?? 0,
      };

      // Extract confidence from output if present
      const confidence = typeof output.confidence === 'number' ? output.confidence : null;

      const costCents = estimateCostCents(tokenUsage);
      const safetyFlags: string[] = [];

      if (costCents > safety.max_cost_cents) {
        safetyFlags.push(`cost_exceeded: ${costCents}c > ${safety.max_cost_cents}c`);
      }

      if (safety.require_human_review) {
        safetyFlags.push('requires_human_review');
      }

      const result: AgentNodeResult = {
        success: true,
        output,
        token_usage: tokenUsage,
        model: 'gpt-4o',
        latency_ms: Date.now() - startTime,
        retries_used: retries,
        confidence,
        safety_flags: safetyFlags,
        truncated: (response.choices[0]?.finish_reason === 'length'),
        fallback_used: null,
      };

      // Validate output against safety constraints (including confidence threshold)
      const validation = validateAgentOutput(result, safety);
      if (!validation.valid) {
        result.safety_flags.push(...validation.violations);
        logger.warn('Agent output safety violation', { agentType, violations: validation.violations });

        // If confidence is below threshold, apply fallback
        const belowThreshold = safety.confidence_threshold > 0
          && confidence !== null
          && confidence < safety.confidence_threshold;
        if (belowThreshold) {
          return applyFallback(definition, startTime, `Confidence ${confidence} below threshold ${safety.confidence_threshold}`);
        }
      }

      recordSuccess(agentType);
      return result;

    } catch (err) {
      retries++;
      if (retries > safety.max_retries) {
        recordFailure(agentType);
        return applyFallback(definition, startTime, `Failed after ${retries} attempts: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 500 * retries));
    }
  }

  // Should not reach here
  return applyFallback(definition, startTime, 'Unexpected executor state');
}

function buildSystemPrompt(definition: AgentNodeDefinition, safety: typeof DEFAULT_SAFETY): string {
  const constraints = [
    `You are a bounded AI agent of archetype "${definition.archetype}".`,
    definition.system_prompt,
    '',
    'CONSTRAINTS:',
    `- Maximum output tokens: ${safety.max_tokens}`,
    `- Maximum reasoning steps: ${safety.max_steps}`,
    safety.blocked_actions.length > 0
      ? `- You must NEVER perform these actions: ${safety.blocked_actions.join(', ')}`
      : '',
    safety.allowed_tools.length > 0
      ? `- You may ONLY use these tools: ${safety.allowed_tools.join(', ')}`
      : '- You have NO tool access. Do not attempt to call any tools.',
    `- Your output must be valid JSON.`,
    safety.confidence_threshold > 0
      ? `- Include a "confidence" field (0-1) in your output. Minimum accepted: ${safety.confidence_threshold}.`
      : '- Include a "confidence" field (0-1) in your output.',
    safety.require_human_review
      ? '- Your output will be reviewed by a human before any action is taken.'
      : '',
    safety.pii_scrub
      ? '- Do NOT include any personally identifiable information in your response.'
      : '',
    '',
    'OUTPUT SCHEMA:',
    JSON.stringify(definition.output_schema, null, 2),
  ].filter(Boolean).join('\n');

  return constraints;
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  // Remove internal workflow metadata that shouldn't be exposed to the LLM
  const sanitized = { ...context };
  delete sanitized._loop_counts;
  delete sanitized._step_count;
  delete sanitized._run_id;
  return sanitized;
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Agent execution timed out after ${ms}ms`)), ms)
  );
}

function applyFallback(definition: AgentNodeDefinition, startTime: number, error: string): AgentNodeResult {
  const fallback = definition.safety.failure_fallback ?? DEFAULT_SAFETY.failure_fallback;

  const base: AgentNodeResult = {
    success: false,
    output: { error, fallback_strategy: fallback },
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: 'none',
    latency_ms: Date.now() - startTime,
    retries_used: 0,
    confidence: null,
    safety_flags: ['execution_failed', `fallback:${fallback}`],
    truncated: false,
    fallback_used: fallback,
  };

  switch (fallback) {
    case 'use_default_output':
      // Return a safe default based on archetype
      base.output = getDefaultOutput(definition.archetype);
      base.success = true;
      base.safety_flags.push('default_output_used');
      break;
    case 'escalate_to_human':
      base.output = { error, requires_human_decision: true, original_task: definition.label };
      break;
    case 'skip':
      base.success = true;
      base.output = { skipped: true, reason: error };
      break;
    case 'abort_run':
      base.output = { error, abort_requested: true };
      break;
  }

  return base;
}

function getDefaultOutput(archetype: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    planner: { recommended_actions: [], confidence: 0, summary: 'Unable to compute — using safe default.' },
    classifier: { classification: 'unknown', confidence: 0, reasoning: 'Classification unavailable — manual review required.' },
    recommender: { recommendations: [], confidence: 0 },
    extractor: { extracted_fields: {}, confidence: 0 },
    critic: { issues: [{ category: 'system', severity: 'medium', description: 'Automated review unavailable — manual review required.' }], risk_level: 'medium', summary: 'Review system unavailable.', review_complete: false },
    router: { recommended_workflow: 'default', recommended_team: 'general', confidence: 0, routing_factors: ['fallback_routing'] },
  };
  return defaults[archetype] ?? { fallback: true, confidence: 0 };
}

function makeMockResult(definition: AgentNodeDefinition, _input: Record<string, unknown>, startTime: number): AgentNodeResult {
  const mockOutputs: Record<string, Record<string, unknown>> = {
    planner: { recommended_actions: [{ action: 'review_documents', priority: 'high', reason: 'Missing disclosures detected' }], confidence: 0.85 },
    classifier: { classification: 'standard', confidence: 0.92, reasoning: 'Document matches standard transaction pattern' },
    recommender: { recommendations: [{ title: 'Consider counter-offer', detail: 'Price is 5% below market', confidence: 0.78 }] },
    extractor: { extracted_fields: { key: 'value' }, confidence: 0.88 },
    critic: { issues: [], risk_level: 'low', summary: 'No compliance concerns detected' },
    router: { route: 'standard_processing', confidence: 0.95, reasoning: 'Transaction meets standard criteria' },
  };

  const output = mockOutputs[definition.archetype] ?? { mock: true };
  const confidence = typeof output.confidence === 'number' ? output.confidence : null;

  return {
    success: true,
    output,
    token_usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 },
    model: 'mock',
    latency_ms: Date.now() - startTime,
    retries_used: 0,
    confidence,
    safety_flags: ['mock_response'],
    truncated: false,
    fallback_used: null,
  };
}
