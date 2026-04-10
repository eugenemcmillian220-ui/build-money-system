# Multi-Key Rotation System - Quick Start Guide

## Setup (5 minutes)

### 1. Configure Your Keys

Edit `.env.local` and add your API keys:

```bash
# Recommended: Use multiple keys for rotation
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
GEMINI_API_KEYS=AIza-key1,AIza-key2,AIza-key3
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2,sk-proj-key3
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3

# Optional: Add more providers
DEEPSEEK_API_KEYS=deepseek-key1,deepseek-key2
CEREBRAS_API_KEYS=cerebras-key1,cerebras-key2
CLOUDFLARE_API_KEYS=cf-key1,cf-key2
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

### 2. Key Formats

**Single Key (No Rotation)**
```bash
GROQ_API_KEY=gsk_abc123
```

**Multiple Keys (With Rotation)**
```bash
# Comma-separated
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3

# Newline-separated (better for many keys)
OPENAI_API_KEYS=sk-proj-key1
sk-proj-key2
sk-proj-key3

# Mixed
GEMINI_API_KEYS=AIza-key1,AIza-key2
AIza-key3,AIza-key4
```

### 3. Verify Configuration

Run the test suite:

```bash
npx tsx tests/key-rotation-standalone.ts
```

Expected output:
```
✅ PASSED: Single key configuration
✅ PASSED: Multiple keys (comma-separated)
✅ PASSED: Multiple keys (newline-separated)
✅ PASSED: Mixed separators (comma and newline)
✅ PASSED: Error tracking and cooldown
✅ PASSED: Success resets error count
✅ PASSED: All providers configured
✅ PASSED: Round-robin distribution
```

## How It Works

### Automatic Rotation

```typescript
// With 3 keys configured:
// Request 1 → key1
// Request 2 → key2
// Request 3 → key3
// Request 4 → key1 (cycles back)
```

### Error Cooldown

```typescript
// After 3 errors, key enters 60s cooldown
keyManager.reportError("groq", "key1");
keyManager.reportError("groq", "key1");
keyManager.reportError("groq", "key1");
// → key1 is skipped for 60 seconds

// Success resets error count
keyManager.reportSuccess("groq", "key1");
// → key1 is fully usable again
```

### Provider Priority

```
Groq → Gemini → OpenRouter → OpenAI → Cerebras → DeepSeek → Cloudflare
```

Providers without keys are automatically skipped.

## Common Use Cases

### 1. Basic Usage

```typescript
import { keyManager } from "@/lib/key-manager";

// Get next available key
const key = keyManager.getKey("groq");

// Check if configured
const isConfigured = keyManager.isConfigured("groq");
```

### 2. With LLM Router

```typescript
import { llmRouter } from "@/lib/llm-router";

// Get next request with automatic provider selection
const req = llmRouter.getNextRequest([
  { role: "user", content: "Hello!" }
]);

// Get fetch parameters with key rotation
const { url, headers, body, apiKey } = llmRouter.getFetchParams(req);
```

### 3. Error Handling

```typescript
try {
  const response = await fetch(url, { headers, body });
  if (!response.ok) {
    keyManager.reportError("groq", apiKey);
    throw new Error("API error");
  }
  keyManager.reportSuccess("groq", apiKey);
} catch (error) {
  keyManager.reportError("groq", apiKey);
  throw error;
}
```

## Configuration Reference

### Environment Variables

| Provider | Single Key | Multi-Key |
|----------|-----------|-----------|
| Groq | `GROQ_API_KEY` | `GROQ_API_KEYS` |
| Gemini | `GEMINI_API_KEY` | `GEMINI_API_KEYS` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_API_KEYS` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_API_KEYS` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_API_KEYS` |
| Cerebras | `CEREBRAS_API_KEY` | `CEREBRAS_API_KEYS` |
| Cloudflare | `CLOUDFLARE_API_KEY` | `CLOUDFLARE_API_KEYS` |

### Priority Order

1. Multi-key (`PROVIDER_API_KEYS`) - **Preferred**
2. Alternative (`PROVIDER_KEYS`) - Medium
3. Single key (`PROVIDER_API_KEY`) - Fallback

## Best Practices

### ✅ Do This

```bash
# Use 3-5 keys per provider
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3,gsk_key4,gsk_key5

# Use different accounts/projects
OPENAI_API_KEYS=sk-proj-account1-key,sk-proj-account2-key

# Monitor and adjust
# Check error rates and add keys as needed
```

### ❌ Avoid This

```bash
# Don't use only 1 key (no rotation, no failover)
GROQ_API_KEY=gsk_single_key

# Don't mix provider keys
GROQ_API_KEYS=gsk_key,sk-or-v1-key  # Wrong!

# Don't commit keys to git
# .env files should be in .gitignore
```

## Troubleshooting

### Keys Not Rotating?

**Problem**: Same key used every request

**Solution**: Use plural environment variable
```bash
# ❌ Wrong
GROQ_API_KEY=gsk_key

# ✅ Correct
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
```

### All Keys Returning Null?

**Problem**: No keys configured

**Solution**: Check environment variables
```bash
echo $GROQ_API_KEYS
echo $GROQ_API_KEY
# Ensure at least one is set
```

### Rate Limiting?

**Problem**: Hitting rate limits despite multiple keys

**Solution**:
- Add more keys to pool
- Check for application errors causing cooldowns
- Verify keys are from different accounts

### Provider Not Selected?

**Problem**: Router skipping provider

**Solution**: Verify configuration
```typescript
keyManager.isConfigured("groq");  // Should return true
const key = keyManager.getKey("groq");  // Should return a key
```

## Performance Tips

### Throughput

- **1 key**: Limited by rate limits
- **3 keys**: ~3x throughput
- **5 keys**: ~5x throughput

### Latency

- Key selection: <1ms
- Cooldown: 60s
- Failover: Immediate

### Monitoring

```typescript
// Check all providers
const providers = ["groq", "gemini", "openai", "openrouter"];
providers.forEach(p => {
  const configured = keyManager.isConfigured(p as any);
  const key = keyManager.getKey(p as any);
  console.log(`${p}: ${configured ? '✅' : '❌'} ${key?.slice(0, 8)}...`);
});
```

## Quick Reference

### Import

```typescript
import { keyManager } from "@/lib/key-manager";
import { llmRouter } from "@/lib/llm-router";
```

### Methods

```typescript
// Key Manager
keyManager.getKey(provider)           // Get next key
keyManager.isConfigured(provider)     // Check if configured
keyManager.reportError(provider, key) // Report error
keyManager.reportSuccess(provider, key) // Report success
keyManager.resetPool(provider)        // Reset pool

// LLM Router
llmRouter.getNextRequest(messages)    // Get next request
llmRouter.getFetchParams(req)         // Get fetch params
```

### Example Config

```bash
# .env.local
GROQ_API_KEYS=gsk_abc123,gsk_def456,gsk_ghi789
GEMINI_API_KEYS=AIza-key1,AIza-key2,AIza-key3
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2,sk-proj-key3
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2
```

## Need More Help?

- Full documentation: `MULTI_KEY_ROTATION.md`
- Test suite: `tests/key-rotation-standalone.ts`
- Implementation: `src/lib/key-manager.ts`
- Examples: Check API routes in `src/app/api/`

## Security Notes

⚠️ **Important**:
- Never commit `.env` files
- Use `.gitignore` to exclude them
- Rotate keys regularly
- Use different keys for dev/prod
- Monitor usage for anomalies

## Ready to Go?

Your multi-key rotation system is now configured! The system will:

✅ Automatically rotate through your keys
✅ Track errors and apply cooldowns
✅ Failover to next available key
✅ Select providers intelligently
✅ Scale with your needs

Start generating with confidence! 🚀
