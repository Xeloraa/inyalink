import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../middleware/errors.js';
import { assertPlatformUrl, assertUrlResolves } from './workLinkCheck.js';

describe('assertPlatformUrl', () => {
  it('accepts matching hosts for named platforms', () => {
    expect(() =>
      assertPlatformUrl('github', 'https://github.com/inyalink'),
    ).not.toThrow();
    expect(() =>
      assertPlatformUrl('behance', 'https://www.behance.net/studio'),
    ).not.toThrow();
    expect(() =>
      assertPlatformUrl('linkedin', 'https://www.linkedin.com/in/someone'),
    ).not.toThrow();
  });

  it('rejects host mismatches', () => {
    expect(() =>
      assertPlatformUrl('github', 'https://gitlab.com/inyalink'),
    ).toThrow(AppError);
  });

  it('allows any http(s) host for website and other', () => {
    expect(() =>
      assertPlatformUrl('website', 'https://example.com/portfolio'),
    ).not.toThrow();
    expect(() =>
      assertPlatformUrl('other', 'https://notion.site/work'),
    ).not.toThrow();
  });
});

describe('assertUrlResolves', () => {
  it('passes when fetch returns a response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    await expect(
      assertUrlResolves('https://example.com'),
    ).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('fails when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ENOTFOUND');
      }),
    );
    await expect(assertUrlResolves('https://nope.invalid')).rejects.toMatchObject(
      { code: 'URL_UNREACHABLE', statusCode: 400 },
    );
    vi.unstubAllGlobals();
  });
});
