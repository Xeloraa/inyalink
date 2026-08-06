import { describe, expect, it } from 'vitest';
import { AppError } from '../src/middleware/errors.js';

describe('AppError', () => {
  it('carries status code and code', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Invalid input');
  });
});
