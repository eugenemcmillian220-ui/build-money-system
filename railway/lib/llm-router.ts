import { GO_ANTHROPIC_MODELS, PROVIDERS } from './providers.js';
import { withRetry } from './retry.js';

type Input = { systemPrompt: string; userPrompt: string; model?: string; stage?: string }
const MAX_TOKENS = 4096;

// ── Verified live models per provider — May 2026 ──────────────
const GITHUB_MODELS = [
  "gpt-4o",                        // Best quality
  "gpt-4o-mini",                   // Fast + cheap  
  "Meta-Llama-3.1-405B-Instruct",  // Largest open model
  "Llama-3.3-70B-Instruct",        // Best quality/speed
  "Meta-Llama-3.1-8B-Instruct",    // Ultra fast
  "Phi-4",                         // Strong reasoning
  "DeepSeek-R1",                   // Reasoning model
  "DeepSeek-V3-0324",              // Latest DeepSeek
  "Cohere-command-a",
];

const ZEN_GO_MODELS = [
  "qwen3.5-plus",
  "qwen3.6-plus",
  "deepseek-v4-pro",
  "kimi-k2.5",
  "kimi-k2.6",
  "glm-5",
  "glm-5.1",
  "mimo-v2.5",
  "mimo-v2.5-pro",
  "hy3-preview",
];

const ZEN_FREE_MODELS = [
  "gpt-5-nano",
  "big-pickle",
  "hy3-preview-free",
  "ling-2.6-flash-free",
];

// Stage → preferred model mapping for quality routing
const STAGE_MODEL_MAP: Record<string, string> = {
  "spec-analysis":              "gpt-4o",
  "market-research":            "gpt-4o",
  "user-persona-definition":    "gpt-4o-mini",
  "tech-stack-selection":       "Meta-Llama-3.1-405B-Instruct",
  "database-schema-design":     "DeepSeek-V3-0324",
  "api-architecture":           "DeepSeek-V3-0324",
  "auth-flow-design":           "gpt-4o-mini",
  "pricing-strategy":           "gpt-4o",
  "stripe-integration-plan":    "gpt-4o-mini",
  "ui-component-plan":          "Phi-4",
  "landing-page-copy":          "gpt-4o",
  "dashboard-layout-design":    "Phi-4",
  "core-api-implementation":    "DeepSeek-R1",
  "supabase-rls-policies":      "DeepSeek-V3-0324",
  "webhook-handler-implementation": "DeepSeek-V3-0324",
  "ai-feature-design":          "gpt-4o",
  "prompt-engineering":         "gpt-4o",
  "test-plan":                  "gpt-4o-mini",
  "error-handling-strategy":    "Meta-Llama-3.1-405B-Instruct",
  "environment-config":         "gpt-4o-mini",
  "deployment-pipeline":        "Phi-4",
  "readme-generation":          "Llama-3.3-70B-Instruct",
  "codebase-map":               "DeepSeek-V3-0324",
  "launch-checklist":           "gpt-4o",
  "deliverable-compilation":    "gpt-4o",
};

// ── Provider chain ────────────────────────────────────────────
type Provider = 'opencodeGo' | 'opencodeZen' | 'github' | 'huggingface';
const CHAIN: Provider[] = ['opencodeGo', 'opencodeZen', 'github', 'huggingface'];

function getKeyEnv(provider: Provider): string {
  switch (provider) {
    case 'opencodeGo':  return 'OPENCODE_GO_API_KEY';
    case 'opencodeZen': return 'OPENCODE_ZEN_API_KEY';
    case 'github':      return 'GITHUB_TOKEN';
    case 'huggingface': return 'HF_TOKEN';
  }
}

function getDefaultModel(provider: Provider, stage?: string): string {
  // Use stage-specific model if available (only for github provider)
  if (provider === 'github' && stage && STAGE_MODEL_MAP[stage]) {
    return process.env.GITHUB_MODEL_OVERRIDE ?? STAGE_MODEL_MAP[stage];
  }
  switch (provider) {
    case 'opencodeGo':  return process.env.OPENCODE_GO_MODEL  ?? 'qwen3.5-plus';
    case 'opencodeZen': return process.env.OPENCODE_ZEN_MODEL ?? 'gpt-5-nano';
    case 'github':      return process.env.GITHUB_MODEL       ?? 'gpt-4o-mini';
    case 'huggingface': return 'meta-llama/Llama-3.3-70B-Instruct';
  }
}

async function callProvider(provider: Provider, input: Input, modelOverride?: string): Promise<string> {
  const keyEnv = getKeyEnv(provider);
  const key = process.env[keyEnv];
  if (!key) throw new Error(keyEnv + ' not configured');

  const model = modelOverride ?? input.model ?? getDefaultModel(provider, input.stage);
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

// Try multiple models within a provider before giving up
async function tryProviderWithFallbacks(provider: Provider, input: Input): Promise<string> {
  const key = process.env[getKeyEnv(provider)];
  if (!key) throw new Error(getKeyEnv(provider) + ' not configured');

  // Build model list: preferred first, then fallbacks
  let models: string[];
  if (provider === 'github') {
    const preferred = input.stage && STAGE_MODEL_MAP[input.stage]
      ? STAGE_MODEL_MAP[input.stage]
      : 'gpt-4o-mini';
    models = [preferred, ...GITHUB_MODELS.filter(m => m !== preferred)];
  } else if (provider === 'opencodeGo') {
    models = [getDefaultModel(provider, input.stage), ...ZEN_GO_MODELS];
  } else if (provider === 'opencodeZen') {
    models = ZEN_FREE_MODELS;
  } else {
    models = ['meta-llama/Llama-3.3-70B-Instruct'];
  }

  let lastErr: unknown;
  for (const model of models.slice(0, 3)) { // Try up to 3 models per provider
    try {
      return await withRetry(() => callProvider(provider, input, model), 2, 500);
    } catch (e) {
      console.warn('[llm-router] ' + provider + '/' + model + ' failed:', e instanceof Error ? e.message : e);
      lastErr = e;
    }
  }
  throw lastErr ?? new Error(provider + ' all models failed');
}

export async function callLLM(input: Input): Promise<string> {
  let last: unknown;
  for (const p of CHAIN) {
    try {
      return await tryProviderWithFallbacks(p, input);
    } catch (e) {
      console.warn('[llm-router] provider ' + p + ' exhausted:', e instanceof Error ? e.message : e);
      last = e;
    }
  }
  throw new Error('All LLM providers exhausted. Last: ' + String(last));
}

// Export model lists for diagnostics
export { GITHUB_MODELS, ZEN_GO_MODELS, ZEN_FREE_MODELS, STAGE_MODEL_MAP };
