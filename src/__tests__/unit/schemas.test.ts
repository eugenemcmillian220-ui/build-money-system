// src/__tests__/unit/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  CreatePipelineJobSchema,
  PaginationQuerySchema,
  BillingCheckoutSchema,
} from '@/lib/schemas';

describe('CreatePipelineJobSchema', () => {
  it('accepts a valid pipeline request', () => {
    const result = CreatePipelineJobSchema.safeParse({
      spec: {
        name: 'TaskFlow AI',
        targetUser: 'remote teams',
        revenueModel: 'subscription',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = CreatePipelineJobSchema.safeParse({
      spec: { name: 'Test' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid revenueModel', () => {
    const result = CreatePipelineJobSchema.safeParse({
      spec: { name: 'Test', targetUser: 'users', revenueModel: 'freemium' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid revenueModel values', () => {
    const models = ['subscription', 'credits', 'hybrid', 'marketplace'];
    for (const revenueModel of models) {
      const result = CreatePipelineJobSchema.safeParse({
        spec: { name: 'Test', targetUser: 'users', revenueModel },
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('PaginationQuerySchema', () => {
  it('defaults limit to 20', () => {
    const result = PaginationQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('caps limit at 100', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });

  it('coerces string limit to number', () => {
    const result = PaginationQuerySchema.parse({ limit: '50' });
    expect(result.limit).toBe(50);
  });

  it('accepts cursor as optional string', () => {
    const result = PaginationQuerySchema.parse({ cursor: '2024-01-01T00:00:00Z' });
    expect(result.cursor).toBe('2024-01-01T00:00:00Z');
  });
});

describe('BillingCheckoutSchema', () => {
  it('accepts valid checkout request', () => {
    const result = BillingCheckoutSchema.safeParse({
      priceId: 'price_123',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URLs', () => {
    const result = BillingCheckoutSchema.safeParse({
      priceId: 'price_123',
      successUrl: 'not-a-url',
      cancelUrl: 'https://example.com/cancel',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing priceId', () => {
    const result = BillingCheckoutSchema.safeParse({
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });
    expect(result.success).toBe(false);
  });
});
