export const PROVIDERS = {
  opencodeGo: {
    baseUrl:
      process.env.OPENCODE_GO_BASE_URL ??
      process.env.OPENCODE_GO_API_URL ??
      'https://opencode.ai/zen/go/v1',
  },
  opencodeZen: {
    baseUrl:
      process.env.OPENCODE_ZEN_BASE_URL ??
      process.env.OPENCODE_ZEN_API_URL ??
      'https://opencode.ai/zen/v1',
  },
  github: {
    baseUrl:
      process.env.GITHUB_MODELS_BASE_URL ??
      process.env.GITHUB_MODELS_API_URL ??
      'https://models.inference.ai.azure.com',
  },
  huggingface: {
    baseUrl:
      process.env.HUGGINGFACE_BASE_URL ??
      process.env.HUGGINGFACE_API_URL ??
      'https://router.huggingface.co/v1',
  },
} as const;

// Models that use Anthropic /messages format (MiniMax via OpenCode Go only)
export const GO_ANTHROPIC_MODELS = new Set(['minimax-m2.5', 'minimax-m2.7']);
