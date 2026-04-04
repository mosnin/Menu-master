'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Clock, Cpu, Zap } from 'lucide-react';
import type { AgentNodeResult, AgentNodeDefinition } from '@/lib/ai/agent-nodes/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgentNodeInspectorProps {
  result: AgentNodeResult | null;
  definition: AgentNodeDefinition | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatArchetype(archetype: string): string {
  return archetype.charAt(0).toUpperCase() + archetype.slice(1);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function tokenPercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentNodeInspector({ result, definition, className }: AgentNodeInspectorProps) {
  const [outputExpanded, setOutputExpanded] = useState(false);

  // ---- Empty state ----
  if (!result) {
    return (
      <Card className={cn('rounded-2xl', className)}>
        <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <Cpu className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Run a workflow to see agent execution results.
          </p>
        </CardContent>
      </Card>
    );
  }

  const promptPct = tokenPercentage(result.token_usage.prompt_tokens, result.token_usage.total_tokens);
  const completionPct = 100 - promptPct;

  const hasViolations = result.safety_flags.length > 0;
  const requiresReview = definition?.safety.require_human_review ?? false;

  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardContent className="flex flex-col gap-5 p-5">
        {/* ---- Header ---- */}
        {definition && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Agent Inspector
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h3 className="text-base font-semibold leading-none">{definition.label}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {formatArchetype(definition.archetype)}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{definition.description}</p>
          </div>
        )}

        {!definition && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Agent Inspector
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Definition not available for this agent node.
            </p>
          </div>
        )}

        <Separator />

        {/* ---- Execution Status ---- */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Execution
          </p>
          <div className="flex items-center gap-3">
            {result.success ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Success
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                <XCircle className="h-4 w-4" />
                Failed
              </div>
            )}
            <span className="text-xs text-muted-foreground">|</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatMs(result.latency_ms)}
            </div>
          </div>
        </div>

        <Separator />

        {/* ---- Token Usage ---- */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Token Usage
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-blue-500/70 transition-all"
              style={{ width: `${promptPct}%` }}
              title={`Prompt: ${result.token_usage.prompt_tokens}`}
            />
            <div
              className="bg-violet-500/70 transition-all"
              style={{ width: `${completionPct}%` }}
              title={`Completion: ${result.token_usage.completion_tokens}`}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Prompt: {result.token_usage.prompt_tokens}</span>
            <span>Completion: {result.token_usage.completion_tokens}</span>
            <span>Total: {result.token_usage.total_tokens}</span>
          </div>
        </div>

        <Separator />

        {/* ---- Model & Retries ---- */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Model
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              {result.model}
            </div>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">
              {result.retries_used} {result.retries_used === 1 ? 'retry' : 'retries'}
            </span>
            {result.truncated && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-600">
                  Truncated
                </Badge>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* ---- Safety Flags ---- */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Safety
          </p>
          <div className="flex flex-wrap gap-1.5">
            {requiresReview && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Requires Human Review
              </Badge>
            )}
            {hasViolations &&
              result.safety_flags.map((flag, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-red-300 bg-red-50 text-[10px] text-red-700"
                >
                  <ShieldAlert className="mr-1 h-3 w-3" />
                  {flag}
                </Badge>
              ))}
            {!requiresReview && !hasViolations && (
              <span className="text-xs text-muted-foreground">No safety flags</span>
            )}
          </div>
        </div>

        <Separator />

        {/* ---- Output JSON (collapsible) ---- */}
        <div>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 text-left"
            onClick={() => setOutputExpanded((prev) => !prev)}
          >
            {outputExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Output
            </span>
          </button>
          {outputExpanded && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          )}
        </div>

        {/* ---- Safety Constraints Summary ---- */}
        {definition && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Constraints
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Max tokens</span>
                <span>{definition.safety.max_tokens}</span>
                <span className="text-muted-foreground">Timeout</span>
                <span>{formatMs(definition.safety.timeout_ms)}</span>
                <span className="text-muted-foreground">Max retries</span>
                <span>{definition.safety.max_retries}</span>
                <span className="text-muted-foreground">Max cost</span>
                <span>{definition.safety.max_cost_cents}c</span>
                <span className="text-muted-foreground">PII scrubbing</span>
                <span>{definition.safety.pii_scrub ? 'Enabled' : 'Disabled'}</span>
              </div>
              {definition.safety.blocked_actions.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[11px] text-muted-foreground">Blocked actions:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {definition.safety.blocked_actions.map((action) => (
                      <Badge key={action} variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {definition.safety.allowed_tools.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[11px] text-muted-foreground">Allowed tools:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {definition.safety.allowed_tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {definition.safety.allowed_tools.length === 0 && (
                <div className="mt-2.5">
                  <span className="text-[11px] text-muted-foreground">Allowed tools: </span>
                  <span className="text-[11px] text-muted-foreground/70">None (no tool use)</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
