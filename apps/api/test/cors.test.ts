import { describe, expect, it } from 'vitest';
import {
  isOriginAllowed,
  isVercelPreviewOrigin,
  parseCorsOrigins,
} from '../src/lib/cors.js';

describe('parseCorsOrigins', () => {
  it('treats empty and * as wildcard', () => {
    expect(parseCorsOrigins(undefined)).toBe('*');
    expect(parseCorsOrigins('')).toBe('*');
    expect(parseCorsOrigins('  *  ')).toBe('*');
  });

  it('splits comma-separated origins and trims whitespace', () => {
    expect(
      parseCorsOrigins(
        'https://inyalink-web-8s8z.vercel.app, https://inyalink.com',
      ),
    ).toEqual([
      'https://inyalink-web-8s8z.vercel.app',
      'https://inyalink.com',
    ]);
  });

  it('strips wrapping quotes around the whole value or each origin', () => {
    expect(
      parseCorsOrigins(
        '"https://inyalink-web-8s8z.vercel.app,https://inyalink.com"',
      ),
    ).toEqual([
      'https://inyalink-web-8s8z.vercel.app',
      'https://inyalink.com',
    ]);
    expect(
      parseCorsOrigins(
        "'https://a.vercel.app', 'https://inyalink.com'",
      ),
    ).toEqual(['https://a.vercel.app', 'https://inyalink.com']);
  });
});

describe('isOriginAllowed', () => {
  const list = parseCorsOrigins(
    'https://inyalink-web-8s8z.vercel.app,https://inyalink.com',
  );

  it('matches an exact listed origin', () => {
    expect(isOriginAllowed('https://inyalink.com', list)).toBe(true);
    expect(
      isOriginAllowed('https://inyalink-web-8s8z.vercel.app', list),
    ).toBe(true);
  });

  it('rejects unknown non-vercel origins', () => {
    expect(isOriginAllowed('https://evil.example', list)).toBe(false);
    expect(isOriginAllowed(undefined, list)).toBe(false);
  });

  it('allows any https *.vercel.app preview host', () => {
    expect(
      isOriginAllowed('https://inyalink-web-git-feat-abc.vercel.app', list),
    ).toBe(true);
    expect(isVercelPreviewOrigin('http://evil.vercel.app')).toBe(false);
    expect(isVercelPreviewOrigin('https://evil.vercel.app.attacker.com')).toBe(
      false,
    );
  });

  it('allows everything when allowlist is *', () => {
    expect(isOriginAllowed('https://anywhere.example', '*')).toBe(true);
  });
});
