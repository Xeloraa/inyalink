import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@inyalink/shared';
import { problemDiagnosisTurn } from './diagnosis.js';
import { encodedProblemRoadmap } from './problemPlans.js';

const MYANMAR = /[\u1000-\u109F]/;
const INVENTED_REACH = /2–5|2-5 percent|၂–၅/;

const SOURCE_Q_EN =
  'When a shop goes quiet, the split that matters is where customers used to come from — that helps determine what kind of professional is actually worth hiring. Were most people finding you on Facebook, walking in off the street, or coming back as regulars?';
const SOURCE_Q_MY =
  'ဆိုင်မှာ customer ပျောက်သွားရင် အရင်က ဘယ်ကနေ လာခဲ့သလဲဆိုတာက ဘယ်သူငှားရမလဲကို ဆုံးဖြတ်ဖို့ အရေးကြီးပါတယ်။ Facebook ကနေ တွေ့တာများပါသလား၊ လမ်းကနေ ဝင်တာများပါသလား၊ ဒါမှမဟုတ် မှန်မှန်လာတဲ့ regulars တွေပါသလား။';

function transcript(
  turns: Array<['user' | 'assistant', string]>,
): ChatMessage[] {
  return turns.map(([role, content]) => ({ role, content }));
}

describe('problemDiagnosisTurn', () => {
  it('asks where customers came from and does not redirect on the opening', () => {
    const result = problemDiagnosisTurn(
      transcript([['user', "my shop isn't getting enough customers"]]),
      'en',
    );
    expect(result?.redirectTo).toBeUndefined();
    expect(result?.nextQuestion).toBe(SOURCE_Q_EN);
    expect(result?.nextQuestion).not.toMatch(/step-by-step|one specific thing/i);
    expect(result?.nextQuestion).not.toMatch(/I'd be happy to help|^Got it\b/);
  });

  it('waits for the Facebook answer, then asks when it changed', () => {
    const result = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        [
          'assistant',
          'When a shop goes quiet, the split that matters is where customers used to come from',
        ],
        ['user', 'Facebook'],
      ]),
      'en',
    );
    expect(result?.redirectTo).toBeUndefined();
    expect(result?.nextQuestion).toBe(
      'Facebook was the main door. Roughly when did it start slowing down?',
    );
  });

  it('produces the Facebook-branch lead-in and redirect after the when-answer', () => {
    const result = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', 'Were most people finding you on Facebook'],
        ['user', 'Facebook'],
        ['assistant', 'Roughly when did it start slowing down?'],
        ['user', 'a few months ago'],
      ]),
      'en',
    );
    expect(result?.redirectTo).toBe('roadmap');
    expect(result?.customerSource).toBe('online');
    expect(result?.nextQuestion).toMatch(/TikTok/);
    expect(result?.nextQuestion).toMatch(/hire/i);
    expect(result?.nextQuestion).not.toMatch(INVENTED_REACH);
    expect(result?.nextQuestion).not.toMatch(/\?/);
  });

  it('does not sell a marketing plan when regulars stopped returning', () => {
    const result = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', 'Were most people finding you on Facebook'],
        ['user', 'regulars'],
        ['assistant', "When did you notice they weren't returning?"],
        ['user', 'last month'],
      ]),
      'en',
    );
    expect(result?.redirectTo).toBeUndefined();
    expect(result?.customerSource).toBeUndefined();
    expect(result?.nextQuestion).toMatch(/can't tell why regulars stopped/i);
    expect(result?.nextQuestion).toMatch(/product|hours|neighbourhood/i);
    expect(result?.nextQuestion).toMatch(/shouldn't sell you a logo/i);
  });

  it('does not invent a reason on the regulars when-question', () => {
    const result = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', SOURCE_Q_EN],
        ['user', 'regulars'],
      ]),
      'en',
    );
    expect(result?.redirectTo).toBeUndefined();
    expect(result?.nextQuestion).toMatch(/can't tell from that alone/i);
    expect(result?.nextQuestion).not.toMatch(/experience, not the advertising/i);
  });

  it('walk-ins wait, then redirect to the street-visibility plan', () => {
    const q2 = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', SOURCE_Q_EN],
        ['user', 'walk-ins'],
      ]),
      'en',
    );
    expect(q2?.redirectTo).toBeUndefined();
    expect(q2?.nextQuestion).toMatch(/street/i);

    const done = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', SOURCE_Q_EN],
        ['user', 'walk-ins'],
        ['assistant', q2!.nextQuestion],
        ['user', 'this year'],
      ]),
      'en',
    );
    expect(done?.redirectTo).toBe('roadmap');
    expect(done?.customerSource).toBe('walkins');
    expect(done?.nextQuestion).toMatch(/hire/i);
  });

  it('I-dont-know uses the social sequence without blaming Facebook', () => {
    const result = problemDiagnosisTurn(
      transcript([
        ['user', "my shop isn't getting enough customers"],
        ['assistant', SOURCE_Q_EN],
        ['user', "I don't know"],
      ]),
      'en',
    );
    expect(result?.redirectTo).toBe('roadmap');
    expect(result?.customerSource).toBe('unsure');
    expect(result?.nextQuestion).not.toMatch(/Facebook was the|collapsed|2–5/);
    expect(result?.nextQuestion).toMatch(/hire/i);
  });

  it('replies in Burmese for a Burmese opening', () => {
    const q1 = problemDiagnosisTurn(
      transcript([['user', 'ဆိုင်မှာ customer မရတော့ဘူး']]),
      'my',
    );
    expect(q1?.nextQuestion).toBe(SOURCE_Q_MY);
    expect(q1?.redirectTo).toBeUndefined();
  });
});

describe('encodedProblemRoadmap', () => {
  it('starts the online branch with TikTok, not signage', () => {
    const plan = encodedProblemRoadmap('online', 'en');
    expect(plan.language).toBe('en');
    expect(plan.steps[0]?.title).toMatch(/TikTok/i);
    expect(plan.steps[0]?.title).not.toMatch(/signage/i);
    expect(plan.steps[0]?.why).toMatch(/Hire someone/i);
    expect(JSON.stringify(plan)).not.toMatch(INVENTED_REACH);
    expect(plan.steps.map((s) => s.category_slug)).toEqual([
      'video-tiktok-content',
      'social-media-marketing',
      'social-media-marketing',
      'photography',
    ]);
  });

  it('starts the walk-ins branch with signage', () => {
    const plan = encodedProblemRoadmap('walkins', 'en');
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]?.title).toMatch(/Signage/i);
    expect(plan.steps[0]?.why).toMatch(/Hire a designer/i);
    expect(plan.steps[1]?.title).toMatch(/Maps/i);
    expect(plan.steps[2]?.title).toMatch(/Photography/i);
  });

  it('unsure plan does not claim Facebook was the cause', () => {
    const plan = encodedProblemRoadmap('unsure', 'en');
    expect(plan.steps[0]?.title).toMatch(/TikTok/i);
    expect(plan.steps[0]?.why).not.toMatch(/Facebook/);
    expect(JSON.stringify(plan)).not.toMatch(INVENTED_REACH);
  });

  it('keeps Burmese plans in Burmese with Latin loanwords', () => {
    const plan = encodedProblemRoadmap('online', 'my');
    expect(plan.language).toBe('my');
    expect(plan.steps[0]?.title).toMatch(MYANMAR);
    expect(plan.steps[0]?.title).toMatch(/TikTok/);
    expect(plan.disclaimer).toMatch(MYANMAR);
    expect(JSON.stringify(plan)).not.toMatch(INVENTED_REACH);
  });

  it('caches matching JSON fixtures for each encoded branch', async () => {
    const { lookupRoadmapDemoFallback } = await import(
      './demo-fallback/cache.js'
    );
    const opening = "my shop isn't getting enough customers";
    const online = lookupRoadmapDemoFallback(opening, 'en', 'online');
    expect(online?.steps?.map((s) => s.title)).toEqual(
      encodedProblemRoadmap('online', 'en').steps.map((s) => s.title),
    );
    expect(online?.steps?.map((s) => s.why)).toEqual(
      encodedProblemRoadmap('online', 'en').steps.map((s) => s.why),
    );
    const walkins = lookupRoadmapDemoFallback(opening, 'en', 'walkins');
    expect(walkins?.steps?.map((s) => s.title)).toEqual(
      encodedProblemRoadmap('walkins', 'en').steps.map((s) => s.title),
    );
    const unsure = lookupRoadmapDemoFallback(opening, 'en', 'unsure');
    expect(unsure?.steps?.map((s) => s.why)).toEqual(
      encodedProblemRoadmap('unsure', 'en').steps.map((s) => s.why),
    );
    const myOpening = 'ဆိုင်မှာ customer မရတော့ဘူး';
    const onlineMy = lookupRoadmapDemoFallback(myOpening, 'my', 'online');
    expect(onlineMy?.steps?.map((s) => s.title)).toEqual(
      encodedProblemRoadmap('online', 'my').steps.map((s) => s.title),
    );
  });
});
