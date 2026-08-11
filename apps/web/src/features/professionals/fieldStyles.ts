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
  'content-writing-burmese': [
    'articles',
    'blog',
    'product-copy',
    'scripts',
    'editing',
  ],
  'video-tiktok-content': [
    'tiktok',
    'reels',
    'editing',
    'shooting',
    'captions',
  ],
  translation: ['my-en', 'en-my', 'documents', 'website', 'subtitling'],
  illustration: ['character', 'editorial', 'packaging', 'digital', 'storyboard'],
  copywriting: ['ads', 'landing', 'email', 'brand-voice', 'my-en'],
  'virtual-assistant': [
    'scheduling',
    'inbox',
    'research',
    'data-entry',
    'customer-care',
  ],
  other: ['general', 'custom', 'multi-skill'],
};

export const FIELD_INPUT =
  'tap-target h-12 w-full rounded-2md border-0 bg-page px-lg text-body text-ink-900 outline-none transition-shadow duration-fast ease-out placeholder:text-ink-300 focus:shadow-focus';

export const FIELD_TEXTAREA =
  'w-full rounded-2md border-0 bg-page px-lg py-md text-body text-ink-900 outline-none transition-shadow duration-fast ease-out placeholder:text-ink-300 focus:shadow-focus';

export const FIELD_PILL_IDLE =
  'tap-target rounded-full bg-page px-[18px] py-2.5 text-[13.5px] font-semibold text-ink-700 transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus';

export const FIELD_PILL_ACTIVE =
  'tap-target rounded-full bg-jade-600 px-[18px] py-2.5 text-[13.5px] font-semibold text-white transition-colors duration-fast ease-out focus-visible:shadow-focus';

export const FIELD_BTN_SECONDARY =
  'tap-target h-12 rounded-2md bg-line-soft px-lg text-body-sm font-semibold text-ink-700 transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus';
