/** Throwaway: node --env-file=../../.env --import tsx scripts/test-converse.ts */
import type { BriefDraft, ChatMessage } from '@inyalink/shared';
import { converseBrief } from '../src/modules/ai/ai.service.js';

const OPENING = 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်';

const FALLBACK_REPLIES = [
  'ဘတ်ဂျက်က ၃ သိန်းကနေ ၅ သိန်းလောက်ပါ။',
  'လာမယ့်လကုန်အထိ လိုချင်ပါတယ်။',
  'Minimalist ပုံစံ၊ အရောင်က အညိုနဲ့ cream ပါ။',
  'နာမည်က Inya Cafe ပါ။ Vector file လိုပါတယ်။',
  'Reference မရှိသေးပါဘူး၊ သင့်အကြံပေးချက်နဲ့ လုပ်ပေးပါ။',
];

function replyTo(question: string, turn: number): string {
  const q = question.toLowerCase();
  if (
    q.includes('အမည်') ||
    q.includes('နာမည်') ||
    q.includes('name') ||
    q.includes('ဆိုင်နာမည်')
  ) {
    return 'ဆိုင်နာမည်က Inya Cafe ပါ။';
  }
  if (
    q.includes('style') ||
    q.includes('ပုံစံ') ||
    q.includes('အရောင်') ||
    q.includes('design') ||
    q.includes('reference') ||
    q.includes('ဥပမာ') ||
    q.includes('ကြိုက်')
  ) {
    return 'Minimalist ပုံစံလိုချင်ပါတယ်။ အရောင်က အညိုနဲ့ cream ပါ။ Reference link မရှိသေးပါဘူး။';
  }
  if (
    q.includes('ဘတ်ဂျက်') ||
    q.includes('budget') ||
    q.includes('ငွေ') ||
    q.includes('ကျသင့်') ||
    q.includes('ကုန်ကျ')
  ) {
    return 'ဘတ်ဂျက်က ၃ သိန်းကနေ ၅ သိန်းလောက်ပါ။';
  }
  if (
    q.includes('deadline') ||
    q.includes('timeline') ||
    q.includes('ရက်') ||
    q.includes('အချိန်') ||
    q.includes('ဘယ်တော့') ||
    q.includes('deadline')
  ) {
    return 'လာမယ့်လကုန်အထိ လိုချင်ပါတယ်။ ၂၀၂၆-၀၉-၃၀ လောက်။';
  }
  if (q.includes('file') || q.includes('format') || q.includes('deliver')) {
    return 'AI/SVG vector file လိုပါတယ်။';
  }
  return FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length] ?? FALLBACK_REPLIES[0]!;
}

const messages: ChatMessage[] = [{ role: 'user', content: OPENING }];
let briefDraft: BriefDraft | undefined;
let safety = 0;

console.log('USER:', OPENING);

while (safety < 8) {
  safety += 1;
  const result = await converseBrief({ messages, briefDraft });
  briefDraft = result.briefDraft;

  console.log('\n--- turn', safety, '---');
  console.log('complete:', result.complete);
  console.log('draft:', JSON.stringify(result.briefDraft, null, 2));

  if (result.complete) {
    console.log('\n=== FINAL briefDraft ===');
    console.log(JSON.stringify(result.briefDraft, null, 2));
    break;
  }

  if (!result.nextQuestion) {
    console.log('\nNo nextQuestion and not complete — stopping.');
    console.log(JSON.stringify(result.briefDraft, null, 2));
    break;
  }

  console.log('QUESTION:', result.nextQuestion);
  const answer = replyTo(result.nextQuestion, safety);
  console.log('USER:', answer);

  messages.push({ role: 'assistant', content: result.nextQuestion });
  messages.push({ role: 'user', content: answer });
}
