import { beforeEach, describe, expect, it, vi } from 'vitest';

const complete = vi.fn();
const insertRoadmap = vi.fn();
const insertAiCall = vi.fn();
const listActiveCategorySlugs = vi.fn();

vi.mock('../../ai/providers/index.js', () => ({
  getProvider: () => ({
    name: 'mock',
    complete,
  }),
}));

vi.mock('./ai.repo.js', () => ({
  insertAiCall: (...args: unknown[]) => insertAiCall(...args),
  insertRoadmap: (...args: unknown[]) => insertRoadmap(...args),
  listActiveCategorySlugs: (...args: unknown[]) =>
    listActiveCategorySlugs(...args),
}));

vi.mock('../../lib/config.js', () => ({
  config: {
    aiProvider: '',
    aiMaxTurns: 5,
    groqApiKey: '',
    demoAiFallback: true,
  },
  aiApiKeyPresent: () => false,
}));

import { converseBrief, createRoadmap } from './ai.service.js';
import { config } from '../../lib/config.js';
import type { ChatMessage } from '@inyalink/shared';

const MYANMAR = /[\u1000-\u109F]/;

function user(content: string): ChatMessage {
  return { role: 'user', content };
}
function assistant(content: string): ChatMessage {
  return { role: 'assistant', content };
}

describe('problem diagnosis with the provider blocked', () => {
  beforeEach(() => {
    complete.mockReset();
    insertRoadmap.mockReset();
    insertAiCall.mockReset();
    listActiveCategorySlugs.mockReset();
    (config as { aiProvider: string }).aiProvider = '';
  });

  it('does not ask hire-vs-plan, waits, then returns the Facebook roadmap in English', async () => {
    const opening = "my shop isn't getting enough customers";
    const q1 = await converseBrief({
      messages: [user(opening)],
      locale: 'my',
    });
    expect(complete).not.toHaveBeenCalled();
    expect(q1.redirectTo).toBeUndefined();
    expect(q1.nextQuestion).toMatch(/Facebook/);
    expect(q1.nextQuestion).not.toMatch(/step-by-step|one specific thing/i);

    const q2 = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('Facebook'),
      ],
      locale: 'my',
    });
    expect(q2.redirectTo).toBeUndefined();
    expect(q2.nextQuestion).toMatch(/when/i);

    const done = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('Facebook'),
        assistant(q2.nextQuestion!),
        user('a few months ago'),
      ],
      locale: 'my',
    });
    expect(done.redirectTo).toBe('roadmap');
    expect(done.customerSource).toBe('online');
    expect(done.nextQuestion).toMatch(/TikTok/);
    expect(done.nextQuestion).not.toMatch(MYANMAR);

    const plan = await createRoadmap(
      { goal: opening, locale: 'my', customerSource: 'online' },
      null,
    );
    expect(plan.language).toBe('en');
    expect(plan.steps?.[0]?.title).toMatch(/TikTok/i);
    expect(plan.steps?.[0]?.title).not.toMatch(/signage/i);
    expect(plan.steps?.[0]?.why).toMatch(/Hire someone/i);
    expect(JSON.stringify(plan.steps)).not.toMatch(/2–5|၂–၅/);
    expect(plan.steps?.map((s) => s.title).join(' ')).not.toMatch(MYANMAR);
  });

  it('walk-ins converse path ends on signage → Maps → photography', async () => {
    const opening = "my shop isn't getting enough customers";
    const q1 = await converseBrief({
      messages: [user(opening)],
      locale: 'en',
    });
    const q2 = await converseBrief({
      messages: [user(opening), assistant(q1.nextQuestion!), user('walk-ins')],
      locale: 'en',
    });
    expect(complete).not.toHaveBeenCalled();
    expect(q2.redirectTo).toBeUndefined();

    const done = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('walk-ins'),
        assistant(q2.nextQuestion!),
        user('this year'),
      ],
      locale: 'en',
    });
    expect(done.redirectTo).toBe('roadmap');
    expect(done.customerSource).toBe('walkins');

    const plan = await createRoadmap(
      { goal: opening, locale: 'en', customerSource: 'walkins' },
      null,
    );
    expect(plan.steps?.map((s) => s.title).join(' ')).toMatch(/Signage/i);
    expect(plan.steps?.map((s) => s.title).join(' ')).toMatch(/Maps/i);
    expect(plan.steps?.map((s) => s.title).join(' ')).toMatch(/Photography/i);
    expect(complete).not.toHaveBeenCalled();
  });

  it('I-dont-know uses the social plan without blaming Facebook', async () => {
    const opening = "my shop isn't getting enough customers";
    const q1 = await converseBrief({
      messages: [user(opening)],
      locale: 'en',
    });
    const done = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user("I don't know"),
      ],
      locale: 'en',
    });
    expect(complete).not.toHaveBeenCalled();
    expect(done.redirectTo).toBe('roadmap');
    expect(done.customerSource).toBe('unsure');
    expect(done.nextQuestion).not.toMatch(/Facebook was the|collapsed|2–5/);

    const plan = await createRoadmap(
      { goal: opening, locale: 'en', customerSource: 'unsure' },
      null,
    );
    expect(plan.steps?.[0]?.title).toMatch(/TikTok/i);
    expect(plan.steps?.[0]?.why).not.toMatch(/Facebook/);
  });

  it('runs the same Facebook branch in Burmese', async () => {
    const opening = 'ဆိုင်မှာ customer မရတော့ဘူး';
    const q1 = await converseBrief({
      messages: [user(opening)],
      locale: 'en',
    });
    expect(q1.nextQuestion).toMatch(MYANMAR);
    expect(q1.nextQuestion).toMatch(
      /ဆိုင်မှာ customer ပျောက်သွားရင် အရင်က ဘယ်ကနေ လာခဲ့သလဲ/,
    );
    expect(q1.redirectTo).toBeUndefined();

    const q2 = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('Facebook ကနေ များပါတယ်'),
      ],
      locale: 'en',
    });
    expect(q2.nextQuestion).toMatch(MYANMAR);
    expect(q2.redirectTo).toBeUndefined();

    const done = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('Facebook ကနေ များပါတယ်'),
        assistant(q2.nextQuestion!),
        user('လွန်ခဲ့တဲ့ လအနည်းငယ်က'),
      ],
      locale: 'en',
    });
    expect(done.redirectTo).toBe('roadmap');
    expect(done.customerSource).toBe('online');
    expect(done.nextQuestion).toMatch(MYANMAR);
    expect(done.nextQuestion).toMatch(/TikTok/);

    const plan = await createRoadmap(
      { goal: opening, locale: 'en', customerSource: 'online' },
      null,
    );
    expect(plan.language).toBe('my');
    expect(plan.steps?.[0]?.title).toMatch(/TikTok/);
    expect(plan.steps?.[0]?.title).toMatch(MYANMAR);
  });

  it('starts walk-ins with signage, not TikTok', async () => {
    const plan = await createRoadmap(
      {
        goal: "my shop isn't getting enough customers",
        locale: 'en',
        customerSource: 'walkins',
      },
      null,
    );
    expect(plan.steps?.[0]?.title).toMatch(/Signage/i);
    expect(plan.language).toBe('en');
  });

  it('does not produce a roadmap when regulars stopped returning', async () => {
    const opening = "my shop isn't getting enough customers";
    const q1 = await converseBrief({
      messages: [user(opening)],
      locale: 'en',
    });
    const q2 = await converseBrief({
      messages: [user(opening), assistant(q1.nextQuestion!), user('regulars')],
      locale: 'en',
    });
    const done = await converseBrief({
      messages: [
        user(opening),
        assistant(q1.nextQuestion!),
        user('regulars'),
        assistant(q2.nextQuestion!),
        user('last month'),
      ],
      locale: 'en',
    });
    expect(done.redirectTo).toBeUndefined();
    expect(done.nextQuestion).toMatch(/can't tell why regulars stopped/i);
    expect(done.nextQuestion).toMatch(/product|hours|neighbourhood/i);
    expect(complete).not.toHaveBeenCalled();
  });

  it('follows the user message language, not the UI toggle', async () => {
    const enUiMy = await converseBrief({
      messages: [user("my shop isn't getting enough customers")],
      locale: 'my',
    });
    expect(enUiMy.nextQuestion).not.toMatch(MYANMAR);

    const myUiEn = await converseBrief({
      messages: [user('ဆိုင်မှာ customer မရတော့ဘူး')],
      locale: 'en',
    });
    expect(myUiEn.nextQuestion).toMatch(MYANMAR);

    const enUiEn = await converseBrief({
      messages: [user("my shop isn't getting enough customers")],
      locale: 'en',
    });
    expect(enUiEn.nextQuestion).not.toMatch(MYANMAR);

    const myUiMy = await converseBrief({
      messages: [user('ဆိုင်မှာ customer မရတော့ဘူး')],
      locale: 'my',
    });
    expect(myUiMy.nextQuestion).toMatch(MYANMAR);
    expect(complete).not.toHaveBeenCalled();
  });

  it('serves the cafe-logo converse opening in the input language', async () => {
    const en = await converseBrief({
      messages: [user('I need a logo for my cafe')],
      locale: 'my',
    });
    expect(en.nextQuestion).toBeTruthy();
    expect(en.nextQuestion).not.toMatch(MYANMAR);
    expect(en.briefDraft.category).toBe('graphic-design');

    const my = await converseBrief({
      messages: [user('ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်')],
      locale: 'en',
    });
    expect(my.nextQuestion).toMatch(MYANMAR);
    expect(my.briefDraft.category).toBe('graphic-design');
  });

  it('serves a step-hire opening from the Facebook plan with the provider blocked', async () => {
    const result = await converseBrief({
      messages: [user('TikTok setup and first content')],
      briefDraft: { category: 'video-tiktok-content' },
      locale: 'en',
    });
    expect(result.redirectTo).toBeUndefined();
    expect(result.nextQuestion).toMatch(/TikTok/i);
    expect(result.nextQuestion).not.toMatch(MYANMAR);
    expect(complete).not.toHaveBeenCalled();
  });
});
