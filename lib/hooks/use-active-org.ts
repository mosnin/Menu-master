'use client';

import { useEffect, useState } from 'react';

type OrgContext = {
  orgId: string | null;
  error: string | null;
  loading: boolean;
};

let cachedOrgId: string | null = null;
let inflight: Promise<string | null> | null = null;

async function resolveOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;

  if (typeof window !== 'undefined') {
    const existing = window.sessionStorage.getItem('active_org_id');
    if (existing) {
      cachedOrgId = existing;
      return existing;
    }
  }

  if (!inflight) {
    inflight = fetch('/api/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to resolve organization context.');
        const payload = await response.json();
        return payload.memberships?.[0]?.organization_id ?? null;
      })
      .finally(() => {
        inflight = null;
      });
  }

  const orgId = await inflight;
  if (orgId && typeof window !== 'undefined') {
    window.sessionStorage.setItem('active_org_id', orgId);
  }
  cachedOrgId = orgId;
  return orgId;
}

export function useActiveOrg(): OrgContext {
  const [orgId, setOrgId] = useState<string | null>(cachedOrgId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedOrgId);

  useEffect(() => {
    let mounted = true;
    setLoading(!cachedOrgId);

    resolveOrgId()
      .then((nextOrgId) => {
        if (!mounted) return;
        setOrgId(nextOrgId);
        if (!nextOrgId) setError('No organization found for current user.');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to resolve organization context.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { orgId, error, loading };
}
