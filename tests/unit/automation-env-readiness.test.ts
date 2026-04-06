import { describe, expect, it } from 'vitest';
import { getAutomationEnvReadiness } from '@/lib/config/automation-env';

describe('automation environment readiness', () => {
  it('flags missing required variables', () => {
    const readiness = getAutomationEnvReadiness({
      OPENAI_API_KEY: 'test',
    } as unknown as NodeJS.ProcessEnv);

    expect(readiness.ready).toBe(false);
    expect(readiness.missingRequired).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(readiness.missingRequired).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('reports ready when required variables are present', () => {
    const readiness = getAutomationEnvReadiness({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      OPENAI_API_KEY: 'test',
      AUTH0_SECRET: 'secret',
      AUTH0_ISSUER_BASE_URL: 'https://issuer',
      AUTH0_CLIENT_ID: 'id',
      AUTH0_CLIENT_SECRET: 'client_secret',
    } as unknown as NodeJS.ProcessEnv);

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRequired.length).toBe(0);
  });
});
