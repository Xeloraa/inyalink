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
   * Auto-approve professional applications instead of requiring admin
   * review (professionals.service.ts). Product-breaking if left on in
   * production, so opt-in, not opt-out: default off. Set true only for
   * local/stage-demo use.
   */
  demoAutoApprovePros: optionalBool('DEMO_AUTO_APPROVE_PROS', false),
  /**
   * Seed fake interest and close the matching window early instead of
   * waiting for real activity (matching.service.ts, briefs.service.ts).
   * Product-breaking if left on in production, so opt-in, not opt-out:
   * default off. Set true only for local/stage-demo use.
   */
  demoSeedInterests: optionalBool('DEMO_SEED_INTERESTS', false),
  /**
   * Unauthenticated requests on session-required routes are granted a
   * shared demo identity — or a caller-chosen one, including an
   * admin-flagged seed user, via X-Demo-User-Id — instead of a 401
   * (middleware/requireAuth.ts's attachSession; lib/demoUser.ts).
   *
   * Does NOT gate the AI endpoints: those work anonymously unconditionally
   * (middleware/requireAuth.ts's attachOptionalSession), by design, so that
   * describing a problem and getting a roadmap/matches never requires an
   * account — this flag only ever adds a caller-chosen identity on top for
   * routes that already need one.
   *
   * Product-breaking if left on in production, so opt-in, not opt-out:
   * default off. Set true only for local/stage-demo use.
   */
  demoSharedUser: optionalBool('DEMO_SHARED_USER', false),
  /**
   * Serve demo AI fixtures when the live provider fails / is unset.
   * Default on — including production / Railway. Not tied to NODE_ENV.
   */
  demoAiFallback: optionalBool('DEMO_AI_FALLBACK', true),
  /** Promote matching Supabase Auth email to role=admin (case-insensitive). Empty = off. */
  adminEmail: (process.env['ADMIN_EMAIL'] ?? '').trim().toLowerCase(),
  /**
   * Circuit breaker on total /api/v1/ai/* requests per UTC day, across every
   * caller. Per-key limits (middleware/rateLimit.ts) bound one identity/IP;
   * this bounds aggregate Groq spend when the per-key limit alone would
   * still let many distinct IPs drain the quota together.
   */
  aiDailyCallCap: optionalInt('AI_DAILY_CALL_CAP', 2000),
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
