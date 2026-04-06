'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AutomationNav } from '@/components/ops/automation-nav';
import { AutomationPageState } from '@/components/ops/automation-page-state';
import { AutomationStatusChip } from '@/components/ops/automation-status-chip';
import { useActiveOrg } from '@/lib/hooks/use-active-org';
import {
  createAutomationSuccessNoteAction,
  getAutomationSuccessViewAction,
} from '@/app/actions/automation-onboarding-actions';

export default function AutomationSuccessPage() {
  const { orgId, error: orgError, loading: orgLoading } = useActiveOrg();
  const [view, setView] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  async function load(nextOrgId: string) {
    const result = await getAutomationSuccessViewAction(nextOrgId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setView(result.view);
  }

  useEffect(() => {
    async function init() {
      if (!orgId) return;
      setLoading(true);
      try {
        await load(orgId);
      } catch {
        setError('Failed to load automation success view.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgId]);

  async function addNote() {
    if (!orgId || !noteText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAutomationSuccessNoteAction({
        orgId,
        noteType: 'intervention',
        visibility: 'internal',
        noteText,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNoteText('');
      await load(orgId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation Success"
        description="Role-gated managed success visibility for setup blockers, adoption health, and rollout interventions."
        backHref="/ops"
        backLabel="Operations"
        actions={<Link href="/ops/automation-setup"><Button variant="outline" size="sm">Setup Dashboard</Button></Link>}
      />
      <AutomationNav />
      <AutomationPageState
        loading={loading || orgLoading}
        loadingMessage="Loading success visibility..."
        orgError={orgError}
        error={error}
        onRetry={() => orgId && load(orgId)}
      >
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Stalled or Blocked Setup</p>
                {(view?.blockers ?? []).slice(0, 8).map((item: any) => (
                  <p key={item.id} className="text-xs text-muted-foreground flex items-center gap-2">{item.blocker_type} <AutomationStatusChip status={item.severity === 'critical' ? 'blocked' : 'ready_for_review'} /></p>
                ))}
                {(view?.blockers ?? []).length === 0 && <p className="text-xs text-muted-foreground">No unresolved blockers.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Adoption Health</p>
                {(view?.health ?? []).slice(0, 8).map((item: any) => (
                  <p key={item.id} className="text-xs text-muted-foreground flex items-center gap-2"><AutomationStatusChip status={item.adoption_state} /> <span>score {item.health_score}</span></p>
                ))}
                {(view?.health ?? []).length === 0 && <p className="text-xs text-muted-foreground">No health summaries yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Success Notes</p>
                <Textarea rows={5} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Add intervention or handoff note" />
                <Button size="sm" disabled={busy || !noteText.trim()} onClick={addNote}>Add internal note</Button>
                {(view?.notes ?? []).slice(0, 4).map((item: any) => (
                  <p key={item.id} className="text-xs text-muted-foreground">{item.note_type}: {item.note_text}</p>
                ))}
              </CardContent>
            </Card>
          </div>
      </AutomationPageState>
    </div>
  );
}
