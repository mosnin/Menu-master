import { getOpenAIClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';
import type { AgentNodeDefinition, AgentNodeResult, AgentNodeType } from './types';
import { getAgentNodeDefinition } from './registry';
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  validateAgentOutput,
  estimateCostCents,
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
    return makeErrorResult(agentType, startTime, `Unknown agent node type: ${agentType}`);
  }

  // Circuit breaker check
  if (isCircuitOpen(agentType)) {
    return makeErrorResult(agentType, startTime, `Circuit breaker open for ${agentType}. Too many recent failures.`);
  }

  const safety = { ...DEFAULT_SAFETY, ...definition.safety };
  const client = getOpenAIClient();

  if (!client) {
    // Mock fallback
    return makeMockResult(definition, input, startTime);
  }

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
                context: sanitizeContext(workflowContext),
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
        safety_flags: safetyFlags,
        truncated: (response.choices[0]?.finish_reason === 'length'),
      };

      // Validate output against safety constraints
      const validation = validateAgentOutput(result, safety);
      if (!validation.valid) {
        result.safety_flags.push(...validation.violations);
        logger.warn('Agent output safety violation', { agentType, violations: validation.violations });
      }

      recordSuccess(agentType);
      return result;

    } catch (err) {
      retries++;
      if (retries > safety.max_retries) {
        recordFailure(agentType);
        return makeErrorResult(agentType, startTime, `Failed after ${retries} attempts: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 500 * retries));
    }
  }

  // Should not reach here
  return makeErrorResult(agentType, startTime, 'Unexpected executor state');
}

function buildSystemPrompt(definition: AgentNodeDefinition, safety: typeof DEFAULT_SAFETY): string {
  const constraints = [
    `You are a bounded AI agent of archetype "${definition.archetype}".`,
    definition.system_prompt,
    '',
    'CONSTRAINTS:',
    `- Maximum output tokens: ${safety.max_tokens}`,
    `- You must NEVER perform these actions: ${safety.blocked_actions.join(', ')}`,
    `- Your output must be valid JSON.`,
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

function makeErrorResult(agentType: string, startTime: number, error: string): AgentNodeResult {
  return {
    success: false,
    output: { error },
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: 'none',
    latency_ms: Date.now() - startTime,
    retries_used: 0,
    safety_flags: ['execution_failed'],
    truncated: false,
  };
}

function makeMockResult(definition: AgentNodeDefinition, _input: Record<string, unknown>, startTime: number): AgentNodeResult {
  // Generate a plausible mock based on archetype
  const mockOutputs: Record<string, Record<string, unknown>> = {
    planner: { recommended_actions: [{ action: 'review_documents', priority: 'high', reason: 'Missing disclosures detected' }], confidence: 0.85 },
    classifier: { classification: 'standard', confidence: 0.92, reasoning: 'Document matches standard transaction pattern' },
    recommender: { recommendations: [{ title: 'Consider counter-offer', detail: 'Price is 5% below market', confidence: 0.78 }] },
    extractor: { extracted_fields: { key: 'value' }, confidence: 0.88 },
    critic: { issues: [], risk_level: 'low', summary: 'No compliance concerns detected' },
    router: { route: 'standard_processing', confidence: 0.95, reasoning: 'Transaction meets standard criteria' },
  };

  return {
    success: true,
    output: mockOutputs[definition.archetype] ?? { mock: true },
    token_usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 },
    model: 'mock',
    latency_ms: Date.now() - startTime,
    retries_used: 0,
    safety_flags: ['mock_response'],
    truncated: false,
  };
}
