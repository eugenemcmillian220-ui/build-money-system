// src/__tests__/unit/context-manager.test.ts
import { describe, it, expect } from 'vitest';
import { truncateToContextLimit, compressChatHistory, estimateTokenCount } from '@/lib/context-manager';
import type { ChatMessage } from '@/lib/context-manager';

describe('estimateTokenCount', () => {
  it('estimates roughly 1 token per 4 chars', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokenCount(text)).toBe(100);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });
});

describe('truncateToContextLimit', () => {
  const makeMessages = (n: number): ChatMessage[] => [
    { role: 'system', content: 'You are a helpful assistant.' },
    ...Array.from({ length: n }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: 'a'.repeat(200),
    })),
  ];

  it('keeps system message always', () => {
    const messages = makeMessages(20);
    const result = truncateToContextLimit(messages, 1000, 100);
    expect(result[0].role).toBe('system');
  });

  it('truncates when over budget', () => {
    const messages = makeMessages(100);
    const result = truncateToContextLimit(messages, 1000, 100);
    expect(result.length).toBeLessThan(messages.length);
  });

  it('keeps most recent messages', () => {
    const messages = makeMessages(10);
    const lastMsg = messages[messages.length - 1];
    const result = truncateToContextLimit(messages, 4000, 100);
    expect(result).toContainEqual(lastMsg);
  });
});

describe('compressChatHistory', () => {
  it('returns unchanged when <= 4 messages', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    expect(compressChatHistory(messages)).toEqual(messages);
  });

  it('adds a summary message for long histories', () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `Message ${i}`,
    }));
    const result = compressChatHistory(messages);
    const hasSummary = result.some((m) => m.content.includes('compressed'));
    expect(hasSummary).toBe(true);
  });

  it('keeps the last 4 messages intact', () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `Message ${i}`,
    }));
    const result = compressChatHistory(messages);
    const lastFour = messages.slice(-4);
    for (const msg of lastFour) {
      expect(result).toContainEqual(msg);
    }
  });
});
