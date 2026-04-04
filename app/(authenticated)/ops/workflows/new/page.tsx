'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createWorkflowAction } from '@/app/actions/workflow-actions';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Fetch current user org
      const res = await fetch('/api/me');
      if (!res.ok) {
        setError('Unable to load user session.');
        setSubmitting(false);
        return;
      }
      const me = await res.json();
      const orgId = me.memberships?.[0]?.organization_id;
      if (!orgId) {
        setError('No organization found for your account.');
        setSubmitting(false);
        return;
      }

      const result = await createWorkflowAction({
        name: name.trim(),
        description: description.trim() || undefined,
        orgId,
      });

      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      if (result.id) {
        router.push(`/ops/workflows/${result.id}`);
      }
    } catch {
      setError('An unexpected error occurred.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="New Workflow"
        description="Create a new automation workflow for your organization."
        backHref="/ops/workflows"
        backLabel="Workflows"
      />

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
                  {submitting ? 'Creating...' : 'Create Workflow'}
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
