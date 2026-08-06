import { config } from '../../lib/config.js';
import { createOpenAICompatibleProvider } from './openai-compatible.js';
import type { LLMProvider } from './types.js';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export function createGroqProvider(): LLMProvider {
  return createOpenAICompatibleProvider({
    name: 'groq',
    apiKey: config.groqApiKey,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: DEFAULT_MODEL,
    retryRateLimit: true,
  });
}
