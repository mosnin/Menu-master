export type AutomationEnvReadiness = {
  ready: boolean;
  missingRequired: string[];
  warnings: string[];
};

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const recommendedVars = [
  'OPENAI_API_KEY',
  'AUTH0_SECRET',
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
] as const;

export function getAutomationEnvReadiness(env: NodeJS.ProcessEnv = process.env): AutomationEnvReadiness {
  const missingRequired = requiredVars.filter((key) => !env[key]);
  const warnings = recommendedVars
    .filter((key) => !env[key])
    .map((key) => `Missing recommended variable: ${key}`);

  return {
    ready: missingRequired.length === 0,
    missingRequired: [...missingRequired],
    warnings,
  };
}

export function assertAutomationEnvForServerActions(env: NodeJS.ProcessEnv = process.env) {
  const readiness = getAutomationEnvReadiness(env);
  if (!readiness.ready) {
    throw new Error(`Automation environment misconfigured: missing ${readiness.missingRequired.join(', ')}`);
  }
  return readiness;
}
