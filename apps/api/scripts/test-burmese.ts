/** Throwaway: node --env-file=../../.env --import tsx scripts/test-burmese.ts */
import { z } from 'zod';
import { createGroqProvider } from '../src/ai/providers/groq.js';
import { config } from '../src/lib/config.js';

const INPUT = 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?';
const MODEL = 'openai/gpt-oss-120b';
const Schema = z.object({
  category: z.string(),
  title_my: z.string(),
  steps: z.array(z.string()),
});

async function rawText() {
  const t0 = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: INPUT }],
    }),
  });
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  console.log('\n=== 1. RAW TEXT ===');
  console.log(json.choices?.[0]?.message?.content ?? JSON.stringify(json));
  console.log('tokensIn', json.usage?.prompt_tokens, 'tokensOut', json.usage?.completion_tokens);
  console.log('latencyMs', Date.now() - t0);
}

async function structured() {
  const provider = createGroqProvider();
  const result = await provider.complete({
    prompt: 'Extract a brief plan as JSON for this Burmese business goal.',
    input: INPUT,
    schema: Schema,
  });
  console.log('\n=== 2. STRUCTURED ===');
  if (!result.ok) {
    console.log('error:', result.error.code, result.error.message);
    return;
  }
  console.log('validation: ok');
  console.log(JSON.stringify(result.data, null, 2));
  console.log('tokensIn', result.usage.tokensIn, 'tokensOut', result.usage.tokensOut);
  console.log('latencyMs', result.latencyMs);
}

await rawText();
await structured();
