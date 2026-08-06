import { config } from '../../lib/config.js';
import { createGeminiProvider } from './gemini.js';
import { createGroqProvider } from './groq.js';
import { createOpenAIProvider } from './openai.js';
import type { LLMProvider } from './types.js';

export function getProvider(): LLMProvider {
  switch (config.aiProvider) {
    case 'gemini':
      return createGeminiProvider();
    case 'openai':
      return createOpenAIProvider();
    case 'groq':
      return createGroqProvider();
    case '':
      throw new Error('AI_PROVIDER is not set');
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${config.aiProvider}". Use gemini, openai, or groq.`,
      );
  }
}

export type { LLMProvider } from './types.js';
