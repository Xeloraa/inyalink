export type Encoding = 'zawgyi' | 'unicode' | 'unknown';

/** UI / AI response locale derived from message script. */
export type ResponseLocale = 'my' | 'en';

const MYANMAR = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

export function detectEncoding(text: string): Encoding {
  if (MYANMAR.test(text)) {
    return 'unicode';
  }
  return 'unknown';
}

/**
 * Response language from the user's text: any Myanmar script → `my`,
 * otherwise `en`. Used so AI questions follow the opening message, not
 * the UI my/en toggle.
 */
export function detectResponseLocale(text: string): ResponseLocale {
  return MYANMAR.test(text) ? 'my' : 'en';
}
