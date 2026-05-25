// src/__tests__/unit/credits.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, ErrorCode } from '@/lib/error-codes';

// Mock the supabase client used by credits.ts
const mockRpc = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: { balance: 100 }, error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: () => ({
      insert: mockInsert,
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

describe('credits module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  describe('deductCredits', () => {
    it('deducts credits and returns new balance', async () => {
      mockRpc.mockResolvedValueOnce({ data: 90, error: null });
      const { deductCredits } = await import('@/lib/credits');
      const result = await deductCredits('user-1', 10, 'Test deduction');
      expect(result.newBalance).toBe(90);
      expect(mockRpc).toHaveBeenCalledWith('deduct_credits_atomic', { p_user_id: 'user-1', p_amount: 10 });
    });

    it('throws INSUFFICIENT_CREDITS when balance is too low', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'insufficient credits for user user-2' },
      });
      const { deductCredits } = await import('@/lib/credits');
      await expect(deductCredits('user-2', 100, 'Test')).rejects.toMatchObject({
        code: ErrorCode.INSUFFICIENT_CREDITS,
      });
    });

    it('handles concurrent deductions (second fails on insufficient)', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 90, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'insufficient credits' } });

      const { deductCredits } = await import('@/lib/credits');
      const [result1, result2] = await Promise.allSettled([
        deductCredits('user-3', 10, 'First'),
        deductCredits('user-3', 10, 'Second'),
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
    });
  });

  describe('getCreditsBalance', () => {
    it('returns balance for existing user', async () => {
      const { getCreditsBalance } = await import('@/lib/credits');
      const balance = await getCreditsBalance('user-1');
      expect(balance).toBe(100);
    });

    it('returns 0 for user with no credits row', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      const { getCreditsBalance } = await import('@/lib/credits');
      const balance = await getCreditsBalance('nonexistent');
      expect(balance).toBe(0);
    });
  });
});
