import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Read version from package.json at build time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('@/package.json') as { version: string };

interface CheckResult {
  status: 'ok' | 'fail';
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return { status: 'fail', error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    }

    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await client.rpc('', undefined).maybeSingle();
    // rpc('') may fail — fall back to a simple query
    if (error) {
      const { error: queryError } = await client
        .from('organizations')
        .select('id')
        .limit(1);
      if (queryError) {
        return { status: 'fail', latencyMs: Date.now() - start, error: queryError.message };
      }
    }
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'fail', latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function checkStorage(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return { status: 'fail', error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    }

    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.storage.listBuckets();
    if (error) {
      return { status: 'fail', latencyMs: Date.now() - start, error: error.message };
    }

    const hasBucket = data?.some((b) => b.name === 'documents');
    if (!hasBucket) {
      return { status: 'fail', latencyMs: Date.now() - start, error: 'documents bucket not found' };
    }

    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'fail', latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

function checkAuth(): CheckResult {
  const required = ['AUTH0_SECRET', 'AUTH0_BASE_URL', 'AUTH0_ISSUER_BASE_URL', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { status: 'fail', error: `Missing env vars: ${missing.join(', ')}` };
  }
  return { status: 'ok' };
}

function checkInngest(): CheckResult {
  // Inngest is not strictly required in dev, but flag if missing in production
  if (process.env.NODE_ENV === 'production') {
    const missing = ['INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'].filter((k) => !process.env[k]);
    if (missing.length > 0) {
      return { status: 'fail', error: `Missing env vars: ${missing.join(', ')}` };
    }
  }
  return { status: 'ok' };
}

export async function GET() {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  const auth = checkAuth();
  const inngest = checkInngest();

  const checks = { database, storage, auth, inngest };

  // Critical checks that cause a 503 if any fail
  const critical = [database, storage, auth];
  const allHealthy = critical.every((c) => c.status === 'ok');

  const body = {
    status: allHealthy ? 'ok' : 'degraded',
    version: pkg.version,
    timestamp: new Date().toISOString(),
    checks,
  };

  if (!allHealthy) {
    logger.warn('Health check degraded', { checks });
  }

  return NextResponse.json(body, { status: allHealthy ? 200 : 503 });
}
