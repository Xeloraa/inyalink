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
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  supabaseUrl: process.env['SUPABASE_URL'] ?? '',
  supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'] ?? '',
  aiProvider: process.env['AI_PROVIDER'] ?? '',
  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  openaiApiKey: process.env['OPENAI_API_KEY'] ?? '',
  groqApiKey: process.env['GROQ_API_KEY'] ?? '',
  messageRetentionDays: optionalInt('MESSAGE_RETENTION_DAYS', 90),
  aiMaxTurns: optionalInt('AI_MAX_TURNS', 5),
  /**
   * Hackathon default on. Seeds interests and early-closes so the stage
   * demo never sticks on a waiting screen. Does NOT gate AI fallback.
   */
  demoMode: optionalBool('DEMO_MODE', true),
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
