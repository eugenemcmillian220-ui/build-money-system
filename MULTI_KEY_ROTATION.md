# Multi-Key Rotation System Documentation

## Overview

The platform uses a four-provider rotation chain focused on the OpenCode stack:

1. **OpenCode Go** (primary paid)
2. **OpenCode Zen** (free/low-cost fallback)
3. **GitHub Models** (free fallback)
4. **Hugging Face** (final fallback)

The key manager rotates keys per provider, tracks failures, applies cooldowns, and preserves high availability.

## Provider Priority Chain

```
opencode-go → opencode-zen → github-models → huggingface
```

## Supported Environment Variables

Use only these variables for key + endpoint configuration:

```bash
# OpenCode Go
OPENCODE_GO_API_KEY=sk-go-...
OPENCODE_GO_API_KEYS=sk-go-key1,sk-go-key2
OPENCODE_BASE_URL=https://api.opencode.ai/v1

# OpenCode Zen
OPENCODE_ZEN_API_KEY=sk-zen-...
OPENCODE_ZEN_API_KEYS=sk-zen-key1,sk-zen-key2
OPENCODE_ZEN_BASE_URL=https://api.opencode.ai

# GitHub Models
GITHUB_MODELS_TOKEN=ghp_...
GITHUB_MODELS_BASE_URL=https://models.inference.ai.azure.com

# Hugging Face
HUGGINGFACE_API_KEY=hf_...
HUGGINGFACE_BASE_URL=https://router.huggingface.co/v1
```

## Rotation Behavior

- Round-robin distribution within each provider pool
- Error threshold: **3**
- Cooldown duration: **60 seconds**
- Successful request resets error count for that key

## Usage Examples

```ts
import { keyManager } from "@/lib/key-manager";

const key = keyManager.getKey("opencode-go");
if (!key) throw new Error("No OpenCode Go key configured");

keyManager.reportError("opencode-go", key);
keyManager.reportSuccess("opencode-go", key);
```

```ts
import { llmRouter } from "@/lib/llm-router";

const req = llmRouter.getNextRequest(messages, "codegen", "balanced");
// Provider chosen automatically by priority + health
```

## Best Practices

- Configure multiple keys for OpenCode Go and OpenCode Zen when available.
- Keep GitHub Models and Hugging Face configured as no-cost resilience layers.
- Report all provider errors via `keyManager.reportError(...)` to activate cooldown logic.

## Quick Validation

```bash
# Check configured keys
printenv | rg "OPENCODE_GO_API|OPENCODE_ZEN_API|GITHUB_MODELS_TOKEN|HUGGINGFACE_API_KEY"

# Find any legacy provider references that should be removed
rg -n -i "groq|gemini|openai|openrouter|deepseek|cerebras|cloudflare" .
```
