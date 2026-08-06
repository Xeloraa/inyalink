import type { CompleteArgs, CompletionResult, LLMProvider } from './types.js';
import {
  completeWithSchemaRetry,
  withValidationFeedback,
} from './structured.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 2_000;
const MAX_RATE_LIMIT_BACKOFF_MS = 15_000;

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
  /** When true, HTTP 429 waits once (Retry-After / body hint) then retries. */
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRateLimitBackoffMs(
  response: Response,
  body: string,
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
  return DEFAULT_RATE_LIMIT_BACKOFF_MS;
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

            let response = await fetchOnce();
            const retry429 = args.retryRateLimit ?? cfg.retryRateLimit;
            if (response.status === 429 && retry429) {
              const body = await response.text();
              await sleep(parseRateLimitBackoffMs(response, body));
              response = await fetchOnce();
            }

            if (response.status === 429) {
              throw new RateLimitExhaustedError();
            }

            if (!response.ok) {
              const body = await response.text();
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
