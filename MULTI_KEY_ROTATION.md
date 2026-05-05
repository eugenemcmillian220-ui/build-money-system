# Multi-Key Rotation System Documentation

## Overview

The AI App Builder features a comprehensive multi-key rotation system that automatically manages API keys across multiple LLM providers (Groq, Gemini, OpenAI, OpenRouter, DeepSeek, Cerebras, Cloudflare). This system ensures high availability, load distribution, and automatic failover for production workloads.

## Architecture

### Core Components

1. **Key Manager** (`src/lib/key-manager.ts`)
   - Manages API key pools for each provider
   - Implements round-robin rotation
   - Tracks errors and applies cooldowns
   - Supports fallback to single keys

2. **LLM Router** (`src/lib/llm-router.ts`)
   - Orchestrates provider selection
   - Implements provider priority chain
   - Integrates with key manager for rotation

3. **Provider Pools**
   - Independent key pool per provider
   - Configurable cooldown period (default: 60s)
   - Error threshold for cooldown (default: 3 errors)

## Features

### 1. Automatic Rotation

Keys are rotated using a round-robin algorithm, ensuring even distribution of requests across all available keys.

```typescript
// Example: 3 Groq keys rotating
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3

// Requests sequence:
// 1. gsk_key1
// 2. gsk_key2
// 3. gsk_key3
// 4. gsk_key1 (cycles back)
```

### 2. Error Tracking & Cooldown

Each key tracks error counts and automatically enters cooldown after reaching the threshold.

```typescript
// After 3 consecutive errors:
keyManager.reportError("groq", "gsk_key1");
keyManager.reportError("groq", "gsk_key1");
keyManager.reportError("groq", "gsk_key1");
// → gsk_key1 enters 60s cooldown

// Subsequent requests skip to next available key
```

### 3. Success Reset

Successful requests reset the error count, allowing keys to recover.

```typescript
// Reset error count on success
keyManager.reportSuccess("groq", "gsk_key1");
// → Error count cleared, key fully usable
```

### 4. Flexible Configuration

Supports multiple formats for key specification:

```bash
# Comma-separated (most common)
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3

# Newline-separated (better for many keys)
OPENAI_API_KEYS=sk-proj-key1
sk-proj-key2
sk-proj-key3

# Mixed separators
GEMINI_API_KEYS=AIza-key1,AIza-key2
AIza-key3,AIza-key4

# Single key fallback
GROQ_API_KEY=gsk_fallback_key
```

### 5. Provider Priority Chain

The system automatically selects providers in priority order:

```
Groq → Gemini → OpenRouter → OpenAI → Cerebras → DeepSeek → Cloudflare
```

Providers without keys are automatically skipped.

## Configuration

### Environment Variables

Each provider supports both single key and multi-key environment variables:

```bash
# Groq
GROQ_API_KEY=gsk_...                    # Single key (fallback)
GROQ_API_KEYS=gsk_key1,gsk_key2         # Multiple keys (preferred)
GROQ_KEYS=gsk_key1,gsk_key2             # Alternative naming

# Gemini
GEMINI_API_KEY=AIza...                  # Single key (fallback)
GEMINI_API_KEYS=AIza-key1,AIza-key2    # Multiple keys (preferred)

# OpenAI
OPENAI_API_KEY=sk-proj...                # Single key (fallback)
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2  # Multiple keys (preferred)

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1...          # Single key (fallback)
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2  # Multiple keys (preferred)

# DeepSeek
DEEPSEEK_API_KEY=...                    # Single key (fallback)
DEEPSEEK_API_KEYS=key1,key2             # Multiple keys (preferred)

# Cerebras
CEREBRAS_API_KEY=...                    # Single key (fallback)
CEREBRAS_API_KEYS=key1,key2             # Multiple keys (preferred)

# Cloudflare
CLOUDFLARE_API_KEY=...                  # Single key (fallback)
CLOUDFLARE_API_KEYS=key1,key2           # Multiple keys (preferred)
CLOUDFLARE_ACCOUNT_ID=...               # Required for Cloudflare
```

### Configuration Priority

1. **Multi-key env var** (`PROVIDER_API_KEYS`) - Highest priority
2. **Alternative multi-key** (`PROVIDER_KEYS`) - Medium priority
3. **Single key env var** (`PROVIDER_API_KEY`) - Fallback

### Example Configuration

```bash
# .env.local

# Groq (5 keys for high volume)
GROQ_API_KEYS=gsk_abc123,gsk_def456,gsk_ghi789,gsk_jkl012,gsk_mno345

# Gemini (3 keys)
GEMINI_API_KEYS=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456,AIzaSyZyXwVuTsRqPoNmLkJiHgFeDcBa654321,AIzaSy1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ

# OpenAI (2 keys)
OPENAI_API_KEYS=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz,sk-proj-ZyXwVuTsRqPoNmLkJiHgFeDcBa

# OpenRouter (1 key - falls back to single key)
OPENROUTER_API_KEY=sk-or-v1-abc123def456

# DeepSeek (single key, no rotation)
DEEPSEEK_API_KEY=deepseek-key-here
```

## Usage Examples

### Basic Usage

```typescript
import { keyManager } from "@/lib/key-manager";
import { llmRouter } from "@/lib/llm-router";

// Get next available key from Groq pool
const groqKey = keyManager.getKey("groq");

// Check if a provider is configured
const isGroqConfigured = keyManager.isConfigured("groq");

// Report an error (key will enter cooldown after 3 errors)
keyManager.reportError("groq", groqKey);

// Report success (resets error count)
keyManager.reportSuccess("groq", groqKey);

// Get next request from LLM Router (automatically selects provider)
const request = llmRouter.getNextRequest(messages);
// Returns: { provider: "groq", model: "llama-3.3-70b-versatile", messages, config }
```

### Advanced Usage

```typescript
// Reset provider pool (e.g., after updating env vars)
keyManager.resetPool("groq");

// Monitor provider status
const providers = ["groq", "gemini", "openai", "openrouter"];
providers.forEach(provider => {
  const configured = keyManager.isConfigured(provider);
  const key = keyManager.getKey(provider);
  console.log(`${provider}: ${configured ? '✅' : '❌'} ${key}`);
});
```

## Best Practices

### 1. Key Distribution

- **Use 3-5 keys per provider** for optimal rotation and failover
- Get keys from **different accounts/projects** when possible
- **Monitor rate limits** and adjust key count accordingly

### 2. Key Management

```bash
# Recommended key count per provider:
Groq:        3-5 keys (fastest, high throughput)
Gemini:      2-3 keys (good balance)
OpenAI:      2-3 keys (expensive, use wisely)
OpenRouter:  2-3 keys (aggregator, good fallback)
```

### 3. Error Handling

```typescript
// Always report errors to enable cooldown
try {
  const response = await fetch(groqApiUrl, {
    headers: { Authorization: `Bearer ${key}` }
  });
  if (!response.ok) {
    keyManager.reportError("groq", key);
    throw new Error("Groq API error");
  }
  keyManager.reportSuccess("groq", key);
} catch (error) {
  keyManager.reportError("groq", key);
  throw error;
}
```

### 4. Environment Setup

```bash
# Use .env.local for development
cp .env.local.example .env.local

# Use environment variables in production
# Set via your deployment platform (Vercel, Docker, etc.)
```

## Monitoring & Debugging

### Check Configuration

```typescript
import { keyManager } from "@/lib/key-manager";

// List all configured providers
const providers: ProviderName[] = [
  "groq", "gemini", "openai", "openrouter",
  "deepseek", "cerebras", "cloudflare"
];

providers.forEach(provider => {
  const configured = keyManager.isConfigured(provider);
  if (configured) {
    const key = keyManager.getKey(provider);
    const masked = key ? `${key.slice(0, 8)}...` : "null";
    console.log(`${provider}: ✅ ${masked}`);
  } else {
    console.log(`${provider}: ❌ Not configured`);
  }
});
```

### Test Rotation

```bash
# Run the standalone test suite
npx tsx tests/key-rotation-standalone.ts

# Expected output:
# ✅ PASSED: Single key configuration
# ✅ PASSED: Multiple keys (comma-separated)
# ✅ PASSED: Multiple keys (newline-separated)
# ✅ PASSED: Mixed separators (comma and newline)
# ✅ PASSED: Error tracking and cooldown
# ✅ PASSED: Success resets error count
# ✅ PASSED: All providers configured
# ✅ PASSED: Round-robin distribution
```

## Performance Characteristics

### Throughput

With multi-key rotation, the system can achieve:

- **Single key**: Limited by individual rate limits
- **3 keys**: ~3x throughput (if not rate-limited globally)
- **5 keys**: ~5x throughput (ideal for high-volume applications)

### Latency

- **Key selection**: <1ms (in-memory operation)
- **Cooldown period**: 60s (configurable)
- **Error threshold**: 3 errors (configurable)

### Failover Time

- **Key failover**: Immediate (next request)
- **Provider failover**: 1-2 requests (router rotates to next provider)

## Troubleshooting

### Issue: All keys returning null

**Cause**: No API keys configured for provider

**Solution**:
```bash
# Check environment variables
echo $GROQ_API_KEYS
echo $GROQ_API_KEY

# Ensure at least one is set
```

### Issue: Keys not rotating

**Cause**: Single key configured instead of multi-key

**Solution**:
```bash
# Use plural environment variable
GROQ_API_KEYS=key1,key2,key3  # ✅ Correct
GROQ_API_KEY=key1             # ❌ No rotation
```

### Issue: Rate limiting still occurring

**Cause**: All keys in cooldown or insufficient keys

**Solution**:
- Add more keys to the pool
- Check for application-level issues causing errors
- Consider increasing cooldown duration

### Issue: Provider not selected

**Cause**: Provider not in priority chain or no keys configured

**Solution**:
```typescript
// Check provider availability
keyManager.isConfigured("groq");  // Should return true

// Verify router includes provider
const req = llmRouter.getNextRequest([]);
console.log(req.provider);  // Should show selected provider
```

## API Reference

### KeyManager

```typescript
class KeyManager {
  // Get next available key from provider pool
  getKey(provider: ProviderName): string | null

  // Check if provider has configured keys
  isConfigured(provider: ProviderName): boolean

  // Report error for specific key (triggers cooldown)
  reportError(provider: ProviderName, key: string): void

  // Report success for specific key (resets error count)
  reportSuccess(provider: ProviderName, key: string): void

  // Reset provider pool (re-reads env vars)
  resetPool(provider: ProviderName): void
}
```

### LLMRouter

```typescript
class LLMRouter {
  // Get next provider request with rotation
  getNextRequest(
    messages: ChatMessage[],
    config?: Partial<AgentConfig>
  ): ProviderRequest

  // Get fetch parameters for specific provider
  getFetchParams(req: ProviderRequest): {
    url: string
    headers: Record<string, string>
    body: unknown
    apiKey: string
  }
}
```

### ProviderRequest

```typescript
interface ProviderRequest {
  provider: LLMProvider
  model: string
  messages: ChatMessage[]
  config?: Partial<AgentConfig>
}
```

## Integration Examples

### Next.js API Route

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";
import { llmRouter } from "@/lib/llm-router";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  // Get next request with automatic provider rotation
  const req = llmRouter.getNextRequest([
    { role: "user", content: prompt }
  ]);

  // Get fetch params with key rotation
  const { url, headers, body, apiKey } = llmRouter.getFetchParams(req);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      // Report error for cooldown
      keyManager.reportError(req.provider, apiKey);
      throw new Error("API request failed");
    }

    // Report success
    keyManager.reportSuccess(req.provider, apiKey);

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    keyManager.reportError(req.provider, apiKey);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
```

### Custom Agent Integration

```typescript
// lib/custom-agent.ts
import { keyManager } from "@/lib/key-manager";
import { llmRouter } from "@/lib/llm-router";

class CustomAgent {
  async generate(prompt: string) {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt }
    ];

    let lastError: Error | null = null;
    const maxAttempts = 4;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const req = llmRouter.getNextRequest(messages);
        const { url, headers, body, apiKey } = llmRouter.getFetchParams(req);

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          keyManager.reportError(req.provider, apiKey);
          continue; // Try next provider/key
        }

        keyManager.reportSuccess(req.provider, apiKey);
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw new Error(`All providers failed: ${lastError?.message}`);
  }
}
```

## Security Considerations

1. **Never commit API keys** to version control
2. **Use .gitignore** to exclude .env files
3. **Rotate keys regularly** for security
4. **Use separate keys** for dev/staging/prod
5. **Monitor usage** for unusual patterns
6. **Implement rate limiting** at application level
7. **Use key prefixes** to identify leaks (e.g., `prod_gsk_...`)

## Future Enhancements

Potential improvements to consider:

- **Per-key rate limiting**: Track individual key usage
- **Weighted rotation**: Prefer keys with lower error rates
- **Metrics dashboard**: Visualize key usage and errors
- **Automatic key provisioning**: Integrate with provider APIs
- **Key health checks**: Proactive key validation
- **Dynamic cooldown adjustment**: Based on error patterns

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Run the test suite: `npx tsx tests/key-rotation-standalone.ts`
3. Review the implementation: `src/lib/key-manager.ts`
4. Check the LLM router: `src/lib/llm-router.ts`

## License

This multi-key rotation system is part of the AI App Builder project and is available under the MIT License.
