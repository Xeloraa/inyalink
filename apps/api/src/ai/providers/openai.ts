import { config } from '../../lib/config.js';
import { createOpenAICompatibleProvider } from './openai-compatible.js';
import type { LLMProvider } from './types.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

export function createOpenAIProvider(): LLMProvider {
  return createOpenAICompatibleProvider({
    name: 'openai',
    apiKey: config.openaiApiKey,
    baseUrl: 'https://api.openai.com/v1',
    model: DEFAULT_MODEL,
  });
}
