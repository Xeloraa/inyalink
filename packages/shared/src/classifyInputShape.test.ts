import { describe, expect, it } from 'vitest';
import {
  classifyClarifyReply,
  classifyCustomerSourceAnswer,
  classifyInputShape,
  matchRoadmapStep,
  signalsDontKnow,
  signalsWantsVisibility,
} from './classifyInputShape.js';

describe('classifyInputShape', () => {
  it('routes outcome-shaped English to goal', () => {
    expect(classifyInputShape('I want to open a shop')).toBe('goal');
    expect(classifyInputShape('I want to start a clothing brand')).toBe('goal');
    expect(classifyInputShape('I want to open a cafe')).toBe('goal');
  });

  it('routes decline problems to problem, not a straight-to-plan goal', () => {
    expect(classifyInputShape("my shop isn't getting customers")).toBe(
      'problem',
    );
    expect(
      classifyInputShape("my shop isn't getting enough customers"),
    ).toBe('problem');
    expect(classifyInputShape('sales are down')).toBe('problem');
    expect(classifyInputShape("my Facebook page isn't working")).toBe(
      'problem',
    );
    expect(classifyInputShape('ဆိုင်မှာ customer မရတော့ဘူး')).toBe('problem');
    expect(classifyInputShape('ဆိုင်မှာ ဖောက်သည် မရတော့ဘူး')).toBe('problem');
  });

  it('routes outcome-shaped Burmese to goal', () => {
    expect(classifyInputShape('ဆိုင်ဖွင့်ချင်တယ်')).toBe('goal');
    expect(classifyInputShape('ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်')).toBe('goal');
    expect(
      classifyInputShape('ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?'),
    ).toBe('goal');
  });

  it('routes deliverable-shaped English to service', () => {
    expect(classifyInputShape('I need a logo')).toBe('service');
    expect(classifyInputShape('I want a website')).toBe('service');
    expect(classifyInputShape('looking for a content writer')).toBe('service');
  });

  it('routes deliverable-shaped Burmese to service', () => {
    expect(classifyInputShape('ကော်ဖီဆိုင်အတွက် လိုဂို လိုချင်ပါတယ်')).toBe(
      'service',
    );
    expect(classifyInputShape('ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်')).toBe(
      'service',
    );
  });

  it('asks when both signals compete or neither is clear', () => {
    expect(
      classifyInputShape('I want to open a cafe and need a logo'),
    ).toBe('ambiguous');
    expect(classifyInputShape('help with my business')).toBe('ambiguous');
  });

  it('routes dating / personal / homework to unrelated (§11)', () => {
    expect(classifyInputShape('I want a girlfriend')).toBe('unrelated');
    expect(classifyInputShape('how do I get a boyfriend')).toBe('unrelated');
    expect(classifyInputShape('relationship advice please')).toBe('unrelated');
    expect(classifyInputShape('do my homework')).toBe('unrelated');
    expect(classifyInputShape('what is the capital of France')).toBe(
      'unrelated',
    );
    expect(classifyInputShape('ချစ်သူ လိုချင်တယ်')).toBe('unrelated');
    expect(classifyInputShape('အိမ်စာ ကူညီပေးပါ')).toBe('unrelated');
  });

  it('routes general trivia / entertainment to unrelated', () => {
    expect(classifyInputShape("what's the weather today")).toBe('unrelated');
    expect(classifyInputShape('tell me a joke')).toBe('unrelated');
    expect(classifyInputShape('what time is it')).toBe('unrelated');
    expect(classifyInputShape('write me a poem about the moon')).toBe(
      'unrelated',
    );
    expect(classifyInputShape('ဒီနေ့ ရာသီဥတု ဘယ်လိုရှိလဲ')).toBe('unrelated');
    expect(classifyInputShape('ဘယ်နာရီရှိပြီလဲ')).toBe('unrelated');
  });

  it('keeps hireable asks as service even if dating words appear', () => {
    expect(
      classifyInputShape("I need a logo for my girlfriend's cafe"),
    ).toBe('service');
  });
});

describe('classifyClarifyReply', () => {
  it('detects plan vs hire answers', () => {
    expect(classifyClarifyReply('I want a plan for the whole thing')).toBe(
      'goal',
    );
    expect(classifyClarifyReply('just need to hire for a logo')).toBe(
      'service',
    );
    expect(classifyClarifyReply('အစီအစဉ် လိုချင်တယ်')).toBe('goal');
  });

  it('routes dont-know answers to goal (roadmap)', () => {
    expect(classifyClarifyReply("I haven't thought of it yet")).toBe('goal');
    expect(classifyClarifyReply('no idea where should I start')).toBe('goal');
    expect(classifyClarifyReply('like I said I have no idea')).toBe('goal');
  });
});

describe('classifyCustomerSourceAnswer', () => {
  it('routes Facebook / online answers to online', () => {
    expect(classifyCustomerSourceAnswer('Facebook')).toBe('online');
    expect(classifyCustomerSourceAnswer('mostly from Facebook')).toBe(
      'online',
    );
    expect(classifyCustomerSourceAnswer('Facebook ကနေ များပါတယ်')).toBe(
      'online',
    );
  });

  it('routes walk-in answers to walkins', () => {
    expect(classifyCustomerSourceAnswer('walk-ins')).toBe('walkins');
    expect(classifyCustomerSourceAnswer('people walking in off the street')).toBe(
      'walkins',
    );
    expect(classifyCustomerSourceAnswer('လမ်းကနေ ဝင်တာများပါတယ်')).toBe(
      'walkins',
    );
  });

  it('routes regulars answers to regulars', () => {
    expect(classifyCustomerSourceAnswer('regulars')).toBe('regulars');
    expect(classifyCustomerSourceAnswer('returning customers')).toBe(
      'regulars',
    );
    expect(classifyCustomerSourceAnswer('မှန်မှန် လာတဲ့သူတွေပါ')).toBe(
      'regulars',
    );
  });

  it('treats skip / don’t-know as unsure', () => {
    expect(classifyCustomerSourceAnswer("I don't know")).toBe('unsure');
    expect(classifyCustomerSourceAnswer('Not sure — skip this one.')).toBe(
      'unsure',
    );
    expect(classifyCustomerSourceAnswer('မသိပါ')).toBe('unsure');
  });
});

describe('signalsWantsVisibility', () => {
  it('detects a request for visibility after the regulars honesty turn', () => {
    expect(signalsWantsVisibility('yes, help with visibility')).toBe(true);
    expect(signalsWantsVisibility('Facebook ဘက် ကူညီပေးပါ')).toBe(true);
    expect(signalsWantsVisibility('no thanks')).toBe(false);
  });
});

describe('signalsDontKnow', () => {
  it('detects decline phrases that should hand off to roadmap', () => {
    expect(signalsDontKnow('I have no idea')).toBe(true);
    expect(signalsDontKnow("I haven't thought of it yet")).toBe(true);
    expect(signalsDontKnow('Inya Cafe')).toBe(false);
  });

  it('does not treat field-skip phrasing as a roadmap handoff', () => {
    expect(signalsDontKnow('Not sure — skip this one.')).toBe(false);
    expect(signalsDontKnow('မသေချာပါ — ဒီမေးခွန်းကို ကျော်မယ်။')).toBe(
      false,
    );
  });
});

describe('matchRoadmapStep', () => {
  const steps = [
    {
      order: 1,
      title: 'Brand logo',
      category_slug: 'graphic-design',
    },
    {
      order: 2,
      title: 'Shop photography',
      category_slug: 'photography',
    },
    {
      order: 3,
      title: 'Menu design',
      category_slug: 'print-design',
    },
  ];

  it('matches by step number', () => {
    expect(matchRoadmapStep('step 2', steps)?.order).toBe(2);
    expect(matchRoadmapStep('1', steps)?.order).toBe(1);
    expect(matchRoadmapStep('4', steps)).toBeNull();
    expect(matchRoadmapStep('အဆင့် 3', steps)?.order).toBe(3);
  });

  it('matches bare numbers including Myanmar digits', () => {
    const withFour = [
      ...steps,
      { order: 4, title: 'Social posts', category_slug: 'social-media-marketing' },
    ];
    expect(matchRoadmapStep('4', withFour)?.order).toBe(4);
    expect(matchRoadmapStep('4.', withFour)?.order).toBe(4);
    expect(matchRoadmapStep('၄', withFour)?.order).toBe(4);
  });

  it('matches by ordinal or title', () => {
    expect(matchRoadmapStep('the first one', steps)?.order).toBe(1);
    expect(matchRoadmapStep('Shop photography please', steps)?.order).toBe(2);
    expect(matchRoadmapStep('photography', steps)?.order).toBe(2);
  });

  it('returns null when nothing matches', () => {
    expect(matchRoadmapStep('tell me more about costs', steps)).toBeNull();
  });
});
