/**
 * src/lib/llm-router.ts
 * Sovereign Forge OS — LLM Router
 *
 * Public API used by all agents and API routes.
 * Wraps llm.ts and adds OTel spans.
 *
 * NOTE: Multi-key pool rotation removed.
 * One key per provider, set via single env var.
 *
 * Provider chain: OpenCode Go (paid) → Zen → GitHub Models → HuggingFace
 */

import {
  llmChat,
  llmPrompt,
  llmHealthCheck,
  type LLMMessage,
  type LLMOptions,
  type LLMResult,
} from './llm'

// ─── OTel span wrapper ───────────────────────────────────────────────────────

async function withSpan<T>(
  name: string,
  attrs: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const { traced } = await import('./telemetry')
    return await traced(name, attrs, fn)
  } catch {
    return fn()
  }
}

// ─── Core routed call ─────────────────────────────────────────────────────────

export async function routedChat(
  messages: LLMMessage[],
  opts: LLMOptions & { spanName?: string; spanAttrs?: Record<string, string> } = {}
): Promise<LLMResult> {
  const { spanName = 'llm.chat', spanAttrs = {}, ...llmOpts } = opts
  return withSpan(spanName, {
    'llm.messages': String(messages.length),
    'llm.max_tokens': String(llmOpts.maxTokens ?? 4096),
    ...spanAttrs,
  }, () => llmChat(messages, llmOpts))
}

// ─── Legacy API (used by all existing agents + API routes) ───────────────────

export async function callLLM(
  prompt: string,
  opts: {
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    model?: string
    timeoutMs?: number
  } = {}
): Promise<string> {
  const r = await withSpan('llm.callLLM', {
    'llm.prompt_length': String(prompt.length),
    'llm.has_system': String(!!opts.systemPrompt),
  }, () => llmPrompt(prompt, opts))
  return r.text
}

export async function planSpec(
  userPrompt: string,
  context?: string
): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are The Classifier for Sovereign Forge OS. Return ONLY valid JSON (no markdown):
{ "intent": string, "mode": "saas"|"agent"|"api"|"landing"|"dashboard", "stack": string[], "phases": number[], "complexity": "low"|"medium"|"high"|"sovereign", "estimatedCredits": number, "outline": string[] }`,
    },
    {
      role: 'user',
      content: context ? `Context:\n${context}\n\nPrompt:\n${userPrompt}` : userPrompt,
    },
  ]
  const r = await withSpan('llm.planSpec', { 'llm.agent': 'classifier' }, () =>
    llmChat(messages, { maxTokens: 1024, temperature: 0.3 })
  )
  return r.text
}

export async function buildFromSpec(spec: string, ctx?: string): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are The Developer for Sovereign Forge OS. Generate Next.js 15/TS/Tailwind v4 code. Dark terminal aesthetic: #00ff88, JetBrains Mono. No free tiers. Return FileMap JSON: { "path": "content" }. ONLY valid JSON.`,
    },
    {
      role: 'user',
      content: ctx ? `Spec:\n${spec}\n\nContext:\n${ctx}` : `Spec:\n${spec}`,
    },
  ]
  const r = await withSpan('llm.buildFromSpec', { 'llm.agent': 'developer' }, () =>
    llmChat(messages, { maxTokens: 8192, temperature: 0.4, timeoutMs: 25_000 })
  )
  return r.text
}

// ─── Health ───────────────────────────────────────────────────────────────────

export { llmHealthCheck }
export type { LLMMessage, LLMOptions, LLMResult }

export async function getProviderStatus() {
  const results = await llmHealthCheck()
  return {
    chain: results.map(r => r.provider),
    healthy: results.filter(r => r.ok).map(r => ({ provider: r.provider, latencyMs: r.latencyMs })),
    degraded: results.filter(r => !r.ok).map(r => `${r.provider}: ${r.error ?? 'unknown'}`),
  }
}
