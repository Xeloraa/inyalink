import { config } from '../../lib/config.js';
import type { CompleteArgs, CompletionResult, LLMProvider } from './types.js';
import {
  completeWithSchemaRetry,
  withValidationFeedback,
} from './structured.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = 'gemini-2.0-flash';

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
};

export function createGeminiProvider(): LLMProvider {
  const model = process.env['GEMINI_MODEL'] ?? DEFAULT_MODEL;

  return {
    name: 'gemini',

    async complete<T>(args: CompleteArgs<T>): Promise<CompletionResult<T>> {
      if (!config.geminiApiKey) {
        throw new Error('gemini: API key is not configured');
      }

      return {
        ok: true,
        ...(await completeWithSchemaRetry({
          schema: args.schema,
          prompt: args.prompt,
          input: args.input,
          jsonSchemaTarget: 'openapi-3.0',
          run: async ({ prompt, input, jsonSchema, validationError }) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

            const url =
              `https://generativelanguage.googleapis.com/v1beta/models/` +
              `${model}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;

            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: [
                            prompt,
                            'Respond with a single JSON object only.',
                            withValidationFeedback(input, validationError),
                          ].join('\n\n'),
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: args.temperature ?? 0.2,
                    maxOutputTokens: args.maxTokens ?? 2048,
                    responseMimeType: 'application/json',
                    responseSchema: jsonSchema,
                  },
                }),
              });

              if (!response.ok) {
                const body = await response.text();
                throw new Error(
                  `gemini HTTP ${response.status}: ${body.slice(0, 500)}`,
                );
              }

              const json = (await response.json()) as GeminiResponse;
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!text) {
                throw new Error('gemini: empty completion content');
              }

              return {
                content: text,
                usage: {
                  tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
                  tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
                },
              };
            } finally {
              clearTimeout(timer);
            }
          },
        })),
      };
    },
  };
}
