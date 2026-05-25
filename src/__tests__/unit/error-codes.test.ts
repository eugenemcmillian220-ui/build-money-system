// src/__tests__/unit/error-codes.test.ts
import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode, ERROR_META } from '@/lib/error-codes';

describe('AppError', () => {
  it('has the correct httpStatus', () => {
    const err = new AppError(ErrorCode.NOT_AUTHENTICATED);
    expect(err.httpStatus).toBe(401);
  });

  it('is retryable when the error code says so', () => {
    const retryable = new AppError(ErrorCode.PAYMENT_FAILED);
    const notRetryable = new AppError(ErrorCode.FORBIDDEN);
    expect(retryable.retryable).toBe(true);
    expect(notRetryable.retryable).toBe(false);
  });

  it('has a human-readable message', () => {
    const err = new AppError(ErrorCode.INSUFFICIENT_CREDITS);
    expect(err.message).toMatch(/credits/i);
  });

  it('carries details', () => {
    const err = new AppError(ErrorCode.INVALID_INPUT, { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('ERROR_META', () => {
  it('has an entry for every ErrorCode', () => {
    const codes = Object.values(ErrorCode);
    for (const code of codes) {
      expect(ERROR_META[code]).toBeDefined();
      expect(ERROR_META[code].httpStatus).toBeGreaterThanOrEqual(400);
    }
  });

  it('all entries have required fields', () => {
    for (const [, meta] of Object.entries(ERROR_META)) {
      expect(meta).toHaveProperty('httpStatus');
      expect(meta).toHaveProperty('userMessage');
      expect(meta).toHaveProperty('retryable');
    }
  });
});
