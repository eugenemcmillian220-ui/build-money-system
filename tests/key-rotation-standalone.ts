/**
 * Multi-Key Rotation System - Standalone Test
 * Run with: npx tsx tests/key-rotation-standalone.ts
 */

import { keyManager, ProviderName } from "../src/lib/key-manager";

// Mock environment variables
function mockEnvVars(keys: Record<string, string>): void {
  Object.assign(process.env, keys);
}

function clearMockEnvVars(): void {
  const keysToClear = [
    "GROQ_API_KEY",
    "GROQ_API_KEYS",
    "GEMINI_API_KEY",
    "GEMINI_API_KEYS",
    "OPENAI_API_KEY",
    "OPENAI_API_KEYS",
    "OPENROUTER_API_KEY",
    "OPENROUTER_API_KEYS",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_API_KEYS",
    "CEREBRAS_API_KEY",
    "CEREBRAS_API_KEYS",
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_API_KEYS",
  ];
  keysToClear.forEach((key) => delete process.env[key]);
}

function runTest(name: string, test: () => boolean | void): void {
  try {
    const result = test();
    if (result === false) {
      console.log(`❌ FAILED: ${name}`);
      process.exit(1);
    } else {
      console.log(`✅ PASSED: ${name}`);
    }
  } catch (error) {
    console.log(`❌ ERROR in ${name}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

console.log("🧪 Testing Multi-Key Rotation System\n");
console.log("=" .repeat(60));

// Test 1: Single key configuration
clearMockEnvVars();
mockEnvVars({ GROQ_API_KEY: "gsk-single-key-12345" });
keyManager.resetPool("groq");
runTest("Single key configuration", () => {
  assertEqual(keyManager.isConfigured("groq"), true, "Should be configured");
  assertEqual(keyManager.getKey("groq"), "gsk-single-key-12345", "Should return single key");
  return true;
});

// Test 2: Multiple keys (comma-separated)
clearMockEnvVars();
mockEnvVars({ GEMINI_API_KEYS: "AIza-key1,AIza-key2,AIza-key3" });
keyManager.resetPool("gemini");
runTest("Multiple keys (comma-separated)", () => {
  assertEqual(keyManager.isConfigured("gemini"), true, "Should be configured");
  const keys = [
    keyManager.getKey("gemini"),
    keyManager.getKey("gemini"),
    keyManager.getKey("gemini"),
  ];
  assertEqual(
    keys.includes("AIza-key1") && keys.includes("AIza-key2") && keys.includes("AIza-key3"),
    true,
    "Should include all keys"
  );
  return true;
});

// Test 3: Multiple keys (newline-separated)
clearMockEnvVars();
mockEnvVars({ OPENAI_API_KEYS: "sk-proj-key1\nsk-proj-key2\nsk-proj-key3" });
keyManager.resetPool("openai");
runTest("Multiple keys (newline-separated)", () => {
  const keys = [
    keyManager.getKey("openai"),
    keyManager.getKey("openai"),
    keyManager.getKey("openai"),
  ];
  assertEqual(
    keys.includes("sk-proj-key1") && keys.includes("sk-proj-key2") && keys.includes("sk-proj-key3"),
    true,
    "Should include all keys"
  );
  return true;
});

// Test 4: Mixed separators
clearMockEnvVars();
mockEnvVars({ OPENROUTER_API_KEYS: "sk-or-v1-key1,sk-or-v1-key2\nsk-or-v1-key3" });
keyManager.resetPool("openrouter");
runTest("Mixed separators (comma and newline)", () => {
  const keySet = new Set();
  for (let i = 0; i < 6; i++) {
    const key = keyManager.getKey("openrouter");
    if (key) keySet.add(key);
  }
  assertEqual(keySet.size >= 3, true, "Should have at least 3 unique keys");
  return true;
});

// Test 5: Fallback to single key
clearMockEnvVars();
mockEnvVars({ GROQ_API_KEY: "gsk-fallback-key", GROQ_API_KEYS: "" });
keyManager.resetPool("groq");
runTest("Fallback to single key when multi-key is empty", () => {
  assertEqual(keyManager.isConfigured("groq"), true, "Should be configured");
  assertEqual(keyManager.getKey("groq"), "gsk-fallback-key", "Should use fallback key");
  return true;
});

// Test 6: Error tracking
clearMockEnvVars();
mockEnvVars({ GROQ_API_KEYS: "gsk-key1,gsk-key2,gsk-key3" });
keyManager.resetPool("groq");
runTest("Error tracking and cooldown", () => {
  const key1 = keyManager.getKey("groq")!;
  keyManager.reportError("groq", key1);
  keyManager.reportError("groq", key1);
  keyManager.reportError("groq", key1);
  
  const nextKey = keyManager.getKey("groq");
  assertEqual(nextKey !== key1, true, "Should rotate to different key after cooldown");
  return true;
});

// Test 7: Success resets error count
clearMockEnvVars();
mockEnvVars({ GEMINI_API_KEYS: "AIza-key1,AIza-key2" });
keyManager.resetPool("gemini");
runTest("Success resets error count", () => {
  const key1 = keyManager.getKey("gemini")!;
  keyManager.reportError("gemini", key1);
  keyManager.reportSuccess("gemini", key1);
  
  const nextKey = keyManager.getKey("gemini");
  assertEqual(nextKey, key1, "Should still use same key after success");
  return true;
});

// Test 8: All providers configured
clearMockEnvVars();
mockEnvVars({
  GROQ_API_KEYS: "gsk-key1,gsk-key2",
  GEMINI_API_KEYS: "AIza-key1,AIza-key2",
  OPENAI_API_KEYS: "sk-proj-key1,sk-proj-key2",
  OPENROUTER_API_KEYS: "sk-or-v1-key1,sk-or-v1-key2",
});
runTest("Multiple providers configured", () => {
  const providers: ProviderName[] = ["groq", "gemini", "openai", "openrouter"];
  providers.forEach((provider) => {
    keyManager.resetPool(provider);
    assertEqual(keyManager.isConfigured(provider), true, `${provider} should be configured`);
    assertEqual(!!keyManager.getKey(provider), true, `${provider} should return a key`);
  });
  return true;
});

// Test 9: No keys configured
clearMockEnvVars();
keyManager.resetPool("groq");
runTest("No keys configured", () => {
  assertEqual(keyManager.isConfigured("groq"), false, "Should not be configured");
  assertEqual(keyManager.getKey("groq"), null, "Should return null");
  return true;
});

// Test 10: Whitespace trimming
clearMockEnvVars();
mockEnvVars({ GROQ_API_KEYS: " gsk-key1 , gsk-key2 , gsk-key3 " });
keyManager.resetPool("groq");
runTest("Whitespace trimming in keys", () => {
  const key = keyManager.getKey("groq");
  assertEqual(key, "gsk-key1", "Should trim whitespace");
  return true;
});

// Test 11: Empty keys filtered out
clearMockEnvVars();
mockEnvVars({ GEMINI_API_KEYS: "AIza-key1,,AIza-key2, ,AIza-key3" });
keyManager.resetPool("gemini");
runTest("Empty keys are filtered out", () => {
  const keySet = new Set();
  for (let i = 0; i < 10; i++) {
    const key = keyManager.getKey("gemini");
    if (key) keySet.add(key);
  }
  assertEqual(keySet.size, 3, "Should have exactly 3 non-empty keys");
  return true;
});

// Test 12: Round-robin distribution
clearMockEnvVars();
mockEnvVars({ OPENAI_API_KEYS: "sk-proj-key1,sk-proj-key2,sk-proj-key3,sk-proj-key4" });
keyManager.resetPool("openai");
runTest("Round-robin distribution across keys", () => {
  const keyCounts: Record<string, number> = {
    "sk-proj-key1": 0,
    "sk-proj-key2": 0,
    "sk-proj-key3": 0,
    "sk-proj-key4": 0,
  };

  for (let i = 0; i < 40; i++) {
    const key = keyManager.getKey("openai");
    if (key) keyCounts[key]++;
  }

  const counts = Object.values(keyCounts);
  const allUsed = counts.every((c) => c >= 9 && c <= 11);
  assertEqual(allUsed, true, "Each key should be used approximately 10 times");
  return true;
});

// Test 13: LLM Router integration
clearMockEnvVars();
mockEnvVars({
  GROQ_API_KEYS: "gsk-key1,gsk-key2,gsk-key3",
  GEMINI_API_KEYS: "AIza-key1,AIza-key2",
  OPENAI_API_KEYS: "sk-proj-key1,sk-proj-key2",
});
import { llmRouter } from "../src/lib/llm-router";
runTest("LLM Router with multi-key rotation", () => {
  const req1 = llmRouter.getNextRequest([]);
  const req2 = llmRouter.getNextRequest([]);
  const req3 = llmRouter.getNextRequest([]);
  
  assertEqual(!!req1.provider, true, "Should return a provider");
  assertEqual(!!req2.provider, true, "Should return a provider");
  assertEqual(!!req3.provider, true, "Should return a provider");
  return true;
});

console.log("=" .repeat(60));
console.log("\n✅ All tests passed!\n");
console.log("\n📋 Configuration Summary:");
console.log("  • Single key: GROQ_API_KEY=gsk_...");
console.log("  • Multiple keys: GROQ_API_KEYS=key1,key2,key3");
console.log("  • Supports comma and newline separators");
console.log("  • Automatic rotation with round-robin");
console.log("  • Error tracking with 60s cooldown");
console.log("  • Provider failover: Groq → Gemini → OpenRouter → OpenAI → ...\n");
