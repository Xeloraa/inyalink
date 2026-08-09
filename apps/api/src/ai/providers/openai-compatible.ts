import type { CompleteArgs, CompletionResult, LLMProvider } from './types.js';
import {
  completeWithSchemaRetry,
  withValidationFeedback,
} from './structured.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 1_500;
const MAX_RATE_LIMIT_BACKOFF_MS = 4_000;
/** Initial attempt + this many 429 retries with backoff. */
const MAX_RATE_LIMIT_RETRIES = 2;
/** Cap total sleep so client timeouts (45–60s) still have room for fetches. */
const MAX_TOTAL_RATE_LIMIT_SLEEP_MS = 8_000;

export class RateLimitExhaustedError extends Error {
  constructor(message = 'The AI service is busy. Please try again shortly.') {
    super(message);
    this.name = 'RateLimitExhaustedError';
  }
}

export type OpenAICompatibleConfig = {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  /** When true, HTTP 429 waits (Retry-After / body hint) then retries. */
  retryRateLimit?: boolean;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export function parseRateLimitBackoffMs(
  response: Response,
  body: string,
  attempt = 0,
): number {
  const header = response.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return Math.min(Math.ceil(seconds * 1000), MAX_RATE_LIMIT_BACKOFF_MS);
    }
  }
  const match = /try again in ([\d.]+)\s*s/i.exec(body);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return Math.min(Math.ceil(seconds * 1000), MAX_RATE_LIMIT_BACKOFF_MS);
    }
  }
  // Exponential-ish default: 1.5s, 3s, …
  const exp = DEFAULT_RATE_LIMIT_BACKOFF_MS * 2 ** attempt;
  return Math.min(exp, MAX_RATE_LIMIT_BACKOFF_MS);
}

/** Pull nearly-valid JSON out of Groq's json_validate_failed error body. */
export function salvageFailedGeneration(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: { failed_generation?: unknown; code?: string };
    };
    const failed = parsed.error?.failed_generation;
    if (typeof failed === 'string') {
      const trimmed = failed.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
      // Truncated failed_generation — try to close if it looks like JSON object start.
      if (trimmed.startsWith('{')) {
        const end = trimmed.lastIndexOf('}');
        if (end > 0) return trimmed.slice(0, end + 1);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOpenAICompatibleProvider(
  cfg: OpenAICompatibleConfig,
): LLMProvider {
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = cfg.baseUrl.replace(/\/$/, '');

  return {
    name: cfg.name,

    async complete<T>(args: CompleteArgs<T>): Promise<CompletionResult<T>> {
      if (!cfg.apiKey) {
        throw new Error(`${cfg.name}: API key is not configured`);
      }

      try {
        const result = await completeWithSchemaRetry({
          schema: args.schema,
          prompt: args.prompt,
          input: args.input,
          run: async ({ prompt, input, jsonSchema, validationError }) => {
            const requestBody = JSON.stringify({
              model: args.model ?? cfg.model,
              temperature: args.temperature ?? 0.2,
              max_tokens: args.maxTokens ?? 2048,
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'response',
                  strict: true,
                  schema: jsonSchema,
                },
              },
              messages: [
                {
                  role: 'system',
                  content: `${prompt}\n\nRespond with a single JSON object only.`,
                },
                {
                  role: 'user',
                  content: withValidationFeedback(input, validationError),
                },
              ],
            });

            const fetchOnce = async (): Promise<Response> => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), timeoutMs);
              try {
                return await fetch(`${baseUrl}/chat/completions`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${cfg.apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  signal: controller.signal,
                  body: requestBody,
                });
              } finally {
                clearTimeout(timer);
              }
            };

            const retry429 = args.retryRateLimit ?? cfg.retryRateLimit;
            let response = await fetchOnce();
            let sleptMs = 0;
            let attempt = 0;

            while (
              response.status === 429 &&
              retry429 &&
              attempt < MAX_RATE_LIMIT_RETRIES &&
              sleptMs < MAX_TOTAL_RATE_LIMIT_SLEEP_MS
            ) {
              const body = await response.text();
              const wait = Math.min(
                parseRateLimitBackoffMs(response, body, attempt),
                MAX_TOTAL_RATE_LIMIT_SLEEP_MS - sleptMs,
              );
              if (wait <= 0) break;
              await sleep(wait);
              sleptMs += wait;
              attempt += 1;
              response = await fetchOnce();
            }

            if (response.status === 429) {
              throw new RateLimitExhaustedError();
            }

            if (!response.ok) {
              const body = await response.text();
              // Groq may return usable JSON in failed_generation despite HTTP 400
              // (e.g. null vs string in their json_schema check). Prefer that over failing.
              const salvaged = salvageFailedGeneration(body);
              if (salvaged) {
                return {
                  content: salvaged,
                  usage: { tokensIn: 0, tokensOut: 0 },
                };
              }
              throw new Error(
                `${cfg.name} HTTP ${response.status}: ${body.slice(0, 500)}`,
              );
            }

            const json = (await response.json()) as ChatCompletionResponse;
            const content = json.choices?.[0]?.message?.content;
            if (!content) {
              throw new Error(`${cfg.name}: empty completion content`);
            }

            return {
              content,
              usage: {
                tokensIn: json.usage?.prompt_tokens ?? 0,
                tokensOut: json.usage?.completion_tokens ?? 0,
              },
            };
          },
        });

        return { ok: true, ...result };
      } catch (err) {
        if (err instanceof RateLimitExhaustedError) {
          return {
            ok: false,
            error: {
              code: 'AI_RATE_LIMIT',
              message: err.message,
            },
          };
        }
        throw err;
      }
    },
  };
}
