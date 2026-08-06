import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('accepts a valid health response', () => {
    const result = HealthResponseSchema.parse({ status: 'ok' });
    expect(result).toEqual({ status: 'ok' });
  });

  it('rejects an invalid status', () => {
    expect(() => HealthResponseSchema.parse({ status: 'down' })).toThrow();
  });
});
