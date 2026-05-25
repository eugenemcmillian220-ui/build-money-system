// src/lib/context-manager.ts
// LLM context window management

export const MAX_CONTEXT_RATIO = 0.8;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Truncate message history to fit within the model's context window */
export function truncateToContextLimit(
  messages: ChatMessage[],
  modelContextWindow: number,
  reservedTokens = 1000,
): ChatMessage[] {
  const maxTokens = Math.floor(modelContextWindow * MAX_CONTEXT_RATIO) - reservedTokens;
  const result: ChatMessage[] = [];
  let total = 0;

  const systemMsg = messages.find((m) => m.role === 'system');
  if (systemMsg) {
    total += estimateTokenCount(systemMsg.content);
    result.push(systemMsg);
  }

  const nonSystem = messages.filter((m) => m.role !== 'system').reverse();
  const kept: ChatMessage[] = [];
  for (const msg of nonSystem) {
    const tokens = estimateTokenCount(msg.content);
    if (total + tokens > maxTokens) break;
    total += tokens;
    kept.unshift(msg);
  }

  return [...result, ...kept];
}

/** Compress old messages into a summary to free context space */
export function compressChatHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 4) return messages;

  const system = messages.find((m) => m.role === 'system');
  const recent = messages.slice(-4);
  const old = messages.filter((m) => m.role !== 'system').slice(0, -4);

  const summary: ChatMessage = {
    role: 'system',
    content: `[Previous conversation summary — ${old.length} messages compressed]: ${old.map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join(' | ')}`,
  };

  return [
    ...(system ? [system] : []),
    summary,
    ...recent,
  ];
}
