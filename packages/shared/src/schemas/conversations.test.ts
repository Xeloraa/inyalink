import { describe, expect, it } from 'vitest';
import { conversationTitleFromOpening } from './conversations.js';

describe('conversationTitleFromOpening', () => {
  it('returns the opening text when short', () => {
    expect(conversationTitleFromOpening('I need a logo')).toBe('I need a logo');
  });

  it('truncates by code point without splitting on spaces', () => {
    const long = 'က'.repeat(80);
    const title = conversationTitleFromOpening(long, 60);
    expect([...title.replace(/…$/, '')]).toHaveLength(60);
    expect(title.endsWith('…')).toBe(true);
  });

  it('falls back when empty', () => {
    expect(conversationTitleFromOpening('   ')).toBe('Conversation');
  });
});
