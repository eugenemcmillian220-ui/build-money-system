/**
 * src/lib/llm-router.ts
 * Sovereign Forge OS — LLM Router
 */

import {
  callLLM as coreCallLLM,
  } from './llm'
import type { ChatMessage } from './types'

export type LLMMessage = ChatMessage

export interface LLMOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  timeoutMs?: number
}

export interface LLMResult {
  text: string
  provider: string
  model: string
}

interface HealthStatus {
  provider: string
  ok: boolean
  latencyMs: number
  error?: string
}

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

export async function llmChat(messages: LLMMessage[], opts: LLMOptions = {}): Promise<LLMResult> {
  const text = await coreCallLLM(messages, {
    model: opts.model,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    timeout: opts.timeoutMs,
  })

  return {
    text,
    provider: opts.model ? 'configured-model' : 'auto-router',
    model: opts.model ?? 'auto',
  }
}

export async function llmPrompt(prompt: string, opts: LLMOptions & { systemPrompt?: string } = {}): Promise<LLMResult> {
  const messages: LLMMessage[] = [
    ...(opts.systemPrompt ? [{ role: 'system' as const, content: opts.systemPrompt }] : []),
    { role: 'user', content: prompt },
  ]

  return llmChat(messages, opts)
}

export async function llmHealthCheck(): Promise<HealthStatus[]> {
  const start = Date.now()
  try {
    await coreCallLLM([{ role: 'user', content: 'Respond with exactly: ok' }], { maxTokens: 8, timeout: 12_000 })
    return [{ provider: 'auto-router', ok: true, latencyMs: Date.now() - start }]
  } catch (error) {
    return [{ provider: 'auto-router', ok: false, latencyMs: Date.now() - start, error: error instanceof Error ? error.message : String(error) }]
  }
}

export async function routedChat(messages: LLMMessage[], opts: LLMOptions & { spanName?: string; spanAttrs?: Record<string, string> } = {}): Promise<LLMResult> {
  const { spanName = 'llm.chat', spanAttrs = {}, ...llmOpts } = opts
  return withSpan(spanName, {
    'llm.messages': String(messages.length),
    'llm.max_tokens': String(llmOpts.maxTokens ?? 4096),
    ...spanAttrs,
  }, () => llmChat(messages, llmOpts))
}

export async function callLLM(prompt: string, opts: { systemPrompt?: string; maxTokens?: number; temperature?: number; model?: string; timeoutMs?: number } = {}): Promise<string> {
  const r = await withSpan('llm.callLLM', {
    'llm.prompt_length': String(prompt.length),
    'llm.has_system': String(!!opts.systemPrompt),
  }, () => llmPrompt(prompt, opts))
  return r.text
}

export async function planSpec(userPrompt: string, context?: string): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: 'Return valid JSON only.' },
    { role: 'user', content: context ? `Context:\n${context}\n\nPrompt:\n${userPrompt}` : userPrompt },
  ]
  const r = await withSpan('llm.planSpec', { 'llm.agent': 'classifier' }, () => llmChat(messages, { maxTokens: 1024, temperature: 0.3 }))
  return r.text
}

export async function buildFromSpec(spec: string, ctx?: string): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: 'Generate code as JSON file map only.' },
    { role: 'user', content: ctx ? `Spec:\n${spec}\n\nContext:\n${ctx}` : `Spec:\n${spec}` },
  ]
  const r = await withSpan('llm.buildFromSpec', { 'llm.agent': 'developer' }, () => llmChat(messages, { maxTokens: 8192, temperature: 0.4, timeoutMs: 25_000 }))
  return r.text
}

export async function getProviderStatus() {
  const results = await llmHealthCheck()
  return {
    chain: results.map((r) => r.provider),
    healthy: results.filter((r) => r.ok).map((r) => ({ provider: r.provider, latencyMs: r.latencyMs })),
    degraded: results.filter((r) => !r.ok).map((r) => `${r.provider}: ${r.error ?? 'unknown'}`),
  }
}

export const llmRouter = {
  async executeWithFailover(messages: LLMMessage[], opts: LLMOptions = {}) {
    const result = await llmChat(messages, opts)
    return { content: result.text, provider: result.provider, model: result.model }
  },
}
