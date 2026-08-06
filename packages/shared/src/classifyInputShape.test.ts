import { describe, expect, it } from 'vitest';
import {
  classifyClarifyReply,
  classifyInputShape,
} from './classifyInputShape.js';

describe('classifyInputShape', () => {
  it('routes outcome-shaped English to goal', () => {
    expect(classifyInputShape('I want to open a shop')).toBe('goal');
    expect(classifyInputShape('I want to start a clothing brand')).toBe('goal');
    expect(classifyInputShape("my shop isn't getting customers")).toBe('goal');
    expect(classifyInputShape('I want to open a cafe')).toBe('goal');
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
});
