/**
 * Centralized, Zod-validated environment configuration.
 *
 * Import this module on the server side only.  It reads process.env once and
 * fails fast with a clear message listing every missing / invalid variable.
 */

import { z } from 'zod';

// ── Schema ──────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Auth0
  AUTH0_SECRET: z.string().min(1, 'AUTH0_SECRET is required'),
  AUTH0_BASE_URL: z.string().url('AUTH0_BASE_URL must be a valid URL'),
  AUTH0_ISSUER_BASE_URL: z.string().url('AUTH0_ISSUER_BASE_URL must be a valid URL'),
  AUTH0_CLIENT_ID: z.string().min(1, 'AUTH0_CLIENT_ID is required'),
  AUTH0_CLIENT_SECRET: z.string().min(1, 'AUTH0_CLIENT_SECRET is required'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // OpenAI (optional — AI features degrade gracefully)
  OPENAI_API_KEY: z.string().optional(),

  // Resend (optional — emails logged to console when absent)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Node / Next.js
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// ── Parse & validate ────────────────────────────────────────────────────────

type Env = z.infer<typeof envSchema>;

let _parsed: Env | undefined;

function parse(): Env {
  if (_parsed) return _parsed;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Environment validation failed:\n${missing}\n\nCheck your .env file or Vercel project settings.\n`,
    );
  }

  _parsed = result.data;
  return _parsed;
}

// ── Public typed getters ────────────────────────────────────────────────────

export const env = {
  // Auth0
  get auth0Secret() { return parse().AUTH0_SECRET; },
  get auth0BaseUrl() { return parse().AUTH0_BASE_URL; },
  get auth0IssuerBaseUrl() { return parse().AUTH0_ISSUER_BASE_URL; },
  get auth0ClientId() { return parse().AUTH0_CLIENT_ID; },
  get auth0ClientSecret() { return parse().AUTH0_CLIENT_SECRET; },

  // Supabase
  get supabaseUrl() { return parse().SUPABASE_URL; },
  get supabaseAnonKey() { return parse().SUPABASE_ANON_KEY; },
  get supabaseServiceRoleKey() { return parse().SUPABASE_SERVICE_ROLE_KEY; },

  // OpenAI (optional)
  get openaiApiKey() { return parse().OPENAI_API_KEY ?? null; },
  get hasOpenAI() { return !!parse().OPENAI_API_KEY; },

  // Resend (optional)
  get resendApiKey() { return parse().RESEND_API_KEY ?? null; },
  get resendFromEmail() { return parse().RESEND_FROM_EMAIL ?? 'Deal Desk <noreply@dealdesk.dev>'; },
  get hasResend() { return !!parse().RESEND_API_KEY; },

  // Inngest
  get inngestEventKey() { return parse().INNGEST_EVENT_KEY ?? null; },
  get inngestSigningKey() { return parse().INNGEST_SIGNING_KEY ?? null; },

  // Node / Next.js
  get nodeEnv() { return parse().NODE_ENV; },
  get isProduction() { return parse().NODE_ENV === 'production'; },
  get isDevelopment() { return parse().NODE_ENV === 'development'; },
  get isTest() { return parse().NODE_ENV === 'test'; },
};
