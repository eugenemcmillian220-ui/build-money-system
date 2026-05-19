import { GO_ANTHROPIC_MODELS, PROVIDERS } from './providers.js';
import { withRetry } from './retry.js';

type Input = { systemPrompt: string; userPrompt: string; model?: string };

const CHAIN = ['opencodeGo', 'opencodeZen', 'github', 'huggingface'] as const;

async function callProvider(provider: (typeof CHAIN)[number], input: Input): Promise<string> {
  const keyEnv = provider === 'opencodeGo' ? 'OPENCODE_GO_API_KEY' :
    provider === 'opencodeZen' ? 'OPENCODE_ZEN_API_KEY' :
    provider === 'github' ? 'GITHUB_MODELS_TOKEN' : 'HUGGINGFACE_API_KEY';
  const key = process.env[keyEnv];
  if (!key) throw new Error(`${keyEnv} missing`);

  const model = input.model ?? (provider === 'opencodeGo' ? 'qwen3.5-plus' : 'gpt-4o-mini');
  const baseUrl = PROVIDERS[provider].baseUrl;

  const anthropic = provider === 'opencodeGo' && GO_ANTHROPIC_MODELS.has(model);
  const url = anthropic ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
  const body = anthropic
    ? { model, max_tokens: 2048, messages: [{ role: 'user', content: `${input.systemPrompt}\n\n${input.userPrompt}` }] }
    : { model, messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: input.userPrompt }], max_tokens: 2048 };

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${provider} HTTP ${res.status}`);
  const data = await res.json() as any;
  return anthropic ? (data.content?.[0]?.text ?? '') : (data.choices?.[0]?.message?.content ?? '');
}

export async function callLLM(input: Input): Promise<string> {
  let last: unknown;
  for (const p of CHAIN) {
    try { return await withRetry(() => callProvider(p, input), 1, 300); } catch (e) { last = e; }
  }
  throw new Error(`All providers failed: ${String(last)}`);
}
