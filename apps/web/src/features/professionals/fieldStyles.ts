import type { CategorySlug } from '@inyalink/shared';

export const SKILL_SUGGESTIONS: Record<CategorySlug, string[]> = {
  'graphic-design': ['logo', 'branding', 'packaging', 'illustration', 'print'],
  photography: ['product', 'food', 'event', 'portrait', 'interior'],
  'web-development': ['html', 'css', 'responsive', 'wordpress', 'landing'],
  'social-media-marketing': [
    'facebook',
    'instagram',
    'copywriting',
    'calendar',
    'ads',
  ],
};

export const FIELD_INPUT =
  'tap-target w-full rounded-md border border-line bg-white px-md text-body text-ink-900 outline-none focus:border-jade-400 focus:shadow-focus';

export const FIELD_TEXTAREA =
  'w-full rounded-md border border-line bg-white px-md py-md text-body text-ink-900 outline-none focus:border-jade-400 focus:shadow-focus';
