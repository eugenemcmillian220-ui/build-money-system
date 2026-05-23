import { GO_ANTHROPIC_MODELS, PROVIDERS } from './providers.js';
import { withRetry } from './retry.js';

type Input = { systemPrompt: string; userPrompt: string; model?: string }
const CHAIN = ['opencodeGo', 'opencodeZen', 'github', 'huggingface'] as const;
const MAX_TOKENS = 4096;

async function callProvider(provider: (typeof CHAIN)[number], input: Input): Promise<string> {
  const keyEnv = provider === 'opencodeGo' ? 'OPENCODE_GO_API_KEY' :
    provider === 'opencodeZen' ? 'OPENCODE_ZEN_API_KEY' :
    provider === 'github' ? 'GITHUB_TOKEN' : 'HF_TOKEN';
  const key = process.env[keyEnv];
  if (!key) throw new Error(keyEnv + ' not configured');

  // Default models — verified working May 2026
  const model = input.model ?? (
    provider === 'opencodeGo'  ? (process.env.OPENCODE_GO_MODEL  ?? 'qwen3.5-plus') :
    provider === 'opencodeZen' ? (process.env.OPENCODE_ZEN_MODEL ?? 'qwen3.5-plus') :
    provider === 'github'      ? 'gpt-4o-mini' : 'deepseek-ai/DeepSeek-V3-0324'
  );

  const baseUrl = PROVIDERS[provider].baseUrl;
  const anthropic = provider === 'opencodeGo' && GO_ANTHROPIC_MODELS.has(model);
  const url = anthropic ? baseUrl + '/messages' : baseUrl + '/chat/completions';

  const body = anthropic
    ? {
        model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: input.systemPrompt + '\n\n' + input.userPrompt }],
      }
    : {
        model,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.userPrompt },
        ],
        max_tokens: MAX_TOKENS,
      };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(provider + '/' + model + ' HTTP ' + res.status + ': ' + errText.slice(0, 300));
  }

  const data = await res.json() as Record<string, unknown>;
  const text = anthropic
    ? ((data.content as Array<{ text?: string }>)?.[0]?.text ?? '')
    : ((data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content ?? '');

  if (!text || text.trim().length === 0) {
    throw new Error(provider + '/' + model + ' returned empty response');
  }
  return text;
}

export async function callLLM(input: Input): Promise<string> {
  let last: unknown;
  for (const p of CHAIN) {
    try {
      return await withRetry(() => callProvider(p, input), 2, 500);
    } catch (e) {
      console.warn('[llm-router] ' + p + ' failed:', e instanceof Error ? e.message : e);
      last = e;
    }
  }
  throw new Error('All LLM providers exhausted. Last: ' + String(last));
}
