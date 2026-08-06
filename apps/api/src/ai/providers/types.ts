import type { ZodType } from 'zod';

export type TokenUsage = {
  tokensIn: number;
  tokensOut: number;
};

export type ProviderError = {
  code: string;
  message: string;
};

export type CompletionResult<T> =
  | {
      ok: true;
      data: T;
      usage: TokenUsage;
      latencyMs: number;
    }
  | {
      ok: false;
      error: ProviderError;
    };

export type CompleteArgs<T> = {
  prompt: string;
  input: string;
  schema: ZodType<T>;
  maxTokens?: number;
  temperature?: number;
  /** Override the provider's default model for this call. */
  model?: string;
  /**
   * Override provider default. When false, a 429 returns AI_RATE_LIMIT
   * immediately (no Retry-After sleep) so demo fallback can run before
   * the client times out.
   */
  retryRateLimit?: boolean;
};

export interface LLMProvider {
  name: string;
  complete<T>(args: CompleteArgs<T>): Promise<CompletionResult<T>>;
}
