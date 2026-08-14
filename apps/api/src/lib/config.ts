function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return parsed;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw === '1' || raw.toLowerCase() === 'true') return true;
  if (raw === '0' || raw.toLowerCase() === 'false') return false;
  throw new Error(`Environment variable ${name} must be a boolean`);
}

export const config = {
  port: optionalInt('PORT', 3001),
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_KEY'),
  aiProvider: process.env['AI_PROVIDER'] ?? '',
  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  openaiApiKey: process.env['OPENAI_API_KEY'] ?? '',
  groqApiKey: process.env['GROQ_API_KEY'] ?? '',
  messageRetentionDays: optionalInt('MESSAGE_RETENTION_DAYS', 90),
  aiMaxTurns: optionalInt('AI_MAX_TURNS', 5),
  /**
   * When on: (1) unauthenticated requests are granted a full session as a
   * caller-chosen demo identity — including an admin-flagged one — via the
   * X-Demo-User-Id header (middleware/requireAuth.ts's attachSession); (2)
   * professional applications auto-approve instead of needing admin review
   * (professionals.service.ts); (3) matching seeds fake interest and closes
   * the matching window early instead of waiting for real activity
   * (matching.service.ts, briefs.service.ts). All real-product-breaking if
   * left on, so this must be opt-in, not opt-out: default off. Set
   * DEMO_MODE=true explicitly for local/stage-demo use only.
   */
  demoMode: optionalBool('DEMO_MODE', false),
  /**
   * Serve demo AI fixtures when the live provider fails / is unset.
   * Default on — including production / Railway. Not tied to NODE_ENV.
   */
  demoAiFallback: optionalBool('DEMO_AI_FALLBACK', true),
  /** Promote matching Supabase Auth email to role=admin (case-insensitive). Empty = off. */
  adminEmail: (process.env['ADMIN_EMAIL'] ?? '').trim().toLowerCase(),
} as const;

/** Whether the API key for the configured AI_PROVIDER is non-empty. */
export function aiApiKeyPresent(): boolean {
  switch (config.aiProvider) {
    case 'groq':
      return Boolean(config.groqApiKey);
    case 'openai':
      return Boolean(config.openaiApiKey);
    case 'gemini':
      return Boolean(config.geminiApiKey);
    default:
      return false;
  }
}

export { required, optional };
