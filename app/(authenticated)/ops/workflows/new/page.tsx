'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createWorkflowAction,
  createDraftAction,
  generateWorkflowDraftFromDescriptionAction,
} from '@/app/actions/workflow-actions';
import type { WorkflowGraphData } from '@/types';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedGraph, setGeneratedGraph] = useState<WorkflowGraphData | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [missingInformation, setMissingInformation] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getOrgId(): Promise<string | null> {
    const res = await fetch('/api/me');
    if (!res.ok) return null;
    const me = await res.json();
    return me.memberships?.[0]?.organization_id ?? null;
  }

  async function handleGenerateDraft() {
    if (!prompt.trim()) {
      setError('Describe the workflow in plain English first.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const orgId = await getOrgId();
      if (!orgId) {
        setError('No organization found for your account.');
        return;
      }

      const result = await generateWorkflowDraftFromDescriptionAction({
        orgId,
        description: prompt.trim(),
      });

      if (result.error || !result.graphData) {
        setError(result.error ?? 'Unable to generate a draft graph.');
        return;
      }

      setGeneratedGraph(result.graphData);
      setAssumptions(result.assumptions ?? []);
      setWarnings(result.warnings ?? []);
      setMissingInformation(result.missingInformation ?? []);
      setExplanation(result.explanation ?? []);
      setValid(result.validation?.valid ?? false);
      if (!name.trim()) {
        setName('Generated Workflow Draft');
      }
      if (!description.trim()) {
        setDescription(prompt.trim());
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orgId = await getOrgId();
      if (!orgId) {
        setError('No organization found for your account.');
        return;
      }

      const workflow = await createWorkflowAction({
        name: name.trim(),
        description: description.trim() || undefined,
        orgId,
      });

      if (workflow.error || !workflow.id) {
        setError(workflow.error ?? 'Failed to create workflow.');
        return;
      }

      if (generatedGraph) {
        const draft = await createDraftAction(workflow.id, generatedGraph);
        if (draft.error) {
          setError(draft.error);
          return;
        }
        router.push(`/ops/workflows/${workflow.id}/edit`);
        return;
      }

      router.push(`/ops/workflows/${workflow.id}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="New Workflow"
        description="Create manually or draft from plain English. Generated drafts stay editable and unpublished."
        backHref="/ops/workflows"
        backLabel="Workflows"
      />

      <Card className="rounded-2xl shadow-sm max-w-4xl">
        <CardContent className="p-7 space-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Draft with Plain English
            </Label>
            <Textarea
              placeholder="Example: When a document is uploaded, if disclosures are missing request manual review, wait two days, and escalate with a notification if still blocked."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="rounded-xl resize-none"
            />
            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleGenerateDraft} disabled={generating || !prompt.trim()}>
                {generating ? 'Generating Draft...' : 'Draft Workflow from Description'}
              </Button>
              {valid !== null && (
                <p className={`text-xs ${valid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  Validation: {valid ? 'passes base graph rules' : 'needs review in builder'}
                </p>
              )}
            </div>
          </div>

          {generatedGraph && (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoList title="Inferred Flow" items={explanation} />
              <InfoList title="Assumptions" items={assumptions} />
              <InfoList title="Warnings" items={warnings} tone="warn" />
              <InfoList title="Missing Information" items={missingInformation} tone="warn" />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Workflow Details
        </h3>

        <Card className="rounded-2xl shadow-sm max-w-2xl">
          <CardContent className="p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="workflow-name"
                  className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70"
                >
                  Workflow Name
                </Label>
                <Input
                  id="workflow-name"
                  placeholder="e.g. New Transaction Onboarding"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="workflow-description"
                  className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70"
                >
                  Description
                </Label>
                <Textarea
                  id="workflow-description"
                  placeholder="Briefly describe what this workflow does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-[13px] text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={submitting || !name.trim()}>
                  {submitting ? 'Creating...' : generatedGraph ? 'Create Workflow from Draft' : 'Create Workflow'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/ops/workflows')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone?: 'warn' }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-muted/20'}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
