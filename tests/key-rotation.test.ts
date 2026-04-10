/**
 * Multi-Key Rotation System Test
 * Tests the key-manager's rotation, error tracking, and cooldown functionality
 */

import { keyManager, ProviderName } from "../src/lib/key-manager";

// Mock environment variables for testing
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

describe("Multi-Key Rotation System", () => {
  beforeEach(() => {
    clearMockEnvVars();
  });

  afterEach(() => {
    clearMockEnvVars();
  });

  test("Single key configuration", () => {
    mockEnvVars({
      GROQ_API_KEY: "gsk-single-key-12345",
    });

    keyManager.resetPool("groq");
    expect(keyManager.isConfigured("groq")).toBe(true);
    expect(keyManager.getKey("groq")).toBe("gsk-single-key-12345");
  });

  test("Multiple keys configuration (comma-separated)", () => {
    mockEnvVars({
      GEMINI_API_KEYS: "AIza-key1,AIza-key2,AIza-key3",
    });

    keyManager.resetPool("gemini");
    expect(keyManager.isConfigured("gemini")).toBe(true);

    const key1 = keyManager.getKey("gemini");
    const key2 = keyManager.getKey("gemini");
    const key3 = keyManager.getKey("gemini");
    const key4 = keyManager.getKey("gemini"); // Should cycle back

    expect([key1, key2, key3]).toContain("AIza-key1");
    expect([key1, key2, key3]).toContain("AIza-key2");
    expect([key1, key2, key3]).toContain("AIza-key3");
    expect(key4).toBe(key1); // Round-robin cycle
  });

  test("Multiple keys configuration (newline-separated)", () => {
    mockEnvVars({
      OPENAI_API_KEYS: "sk-proj-key1\nsk-proj-key2\nsk-proj-key3",
    });

    keyManager.resetPool("openai");
    expect(keyManager.isConfigured("openai")).toBe(true);

    const keys = [
      keyManager.getKey("openai"),
      keyManager.getKey("openai"),
      keyManager.getKey("openai"),
    ];

    expect(keys).toContain("sk-proj-key1");
    expect(keys).toContain("sk-proj-key2");
    expect(keys).toContain("sk-proj-key3");
  });

  test("Multiple keys configuration (mixed separators)", () => {
    mockEnvVars({
      OPENROUTER_API_KEYS: "sk-or-v1-key1,sk-or-v1-key2\nsk-or-v1-key3,sk-or-v1-key4",
    });

    keyManager.resetPool("openrouter");
    expect(keyManager.isConfigured("openrouter")).toBe(true);

    const keys = new Set();
    for (let i = 0; i < 10; i++) {
      const key = keyManager.getKey("openrouter");
      keys.add(key);
    }

    expect(keys.size).toBeGreaterThanOrEqual(4);
  });

  test("Multi-key fallback to single key", () => {
    mockEnvVars({
      GROQ_API_KEY: "gsk-fallback-key",
      GROQ_API_KEYS: "", // Empty multi-key
    });

    keyManager.resetPool("groq");
    expect(keyManager.isConfigured("groq")).toBe(true);
    expect(keyManager.getKey("groq")).toBe("gsk-fallback-key");
  });

  test("Error tracking and cooldown", () => {
    mockEnvVars({
      GROQ_API_KEYS: "gsk-key1,gsk-key2,gsk-key3",
    });

    keyManager.resetPool("groq");

    const key1 = keyManager.getKey("groq")!;
    
    // Report errors for key1 (should trigger cooldown after 3 errors)
    keyManager.reportError("groq", key1);
    keyManager.reportError("groq", key1);
    keyManager.reportError("groq", key1);

    // Key1 should now be in cooldown
    const nextKey = keyManager.getKey("groq");
    expect(nextKey).not.toBe(key1);
  });

  test("Success resets error count", () => {
    mockEnvVars({
      GEMINI_API_KEYS: "AIza-key1,AIza-key2",
    });

    keyManager.resetPool("gemini");

    const key1 = keyManager.getKey("gemini")!;
    
    keyManager.reportError("gemini", key1);
    keyManager.reportSuccess("gemini", key1);

    // Error count should be reset, key should still be usable
    const nextKey = keyManager.getKey("gemini");
    expect(nextKey).toBe(key1);
  });

  test("All providers configured", () => {
    mockEnvVars({
      GROQ_API_KEYS: "gsk-key1,gsk-key2",
      GEMINI_API_KEYS: "AIza-key1,AIza-key2",
      OPENAI_API_KEYS: "sk-proj-key1,sk-proj-key2",
      OPENROUTER_API_KEYS: "sk-or-v1-key1,sk-or-v1-key2",
      DEEPSEEK_API_KEYS: "deepseek-key1,deepseek-key2",
      CEREBRAS_API_KEYS: "cerebras-key1,cerebras-key2",
      CLOUDFLARE_API_KEYS: "cf-key1,cf-key2",
    });

    const providers: ProviderName[] = [
      "groq",
      "gemini",
      "openai",
      "openrouter",
      "deepseek",
      "cerebras",
      "cloudflare",
    ];

    providers.forEach((provider) => {
      keyManager.resetPool(provider);
      expect(keyManager.isConfigured(provider)).toBe(true);
      expect(keyManager.getKey(provider)).toBeTruthy();
    });
  });

  test("No keys configured", () => {
    keyManager.resetPool("groq");
    expect(keyManager.isConfigured("groq")).toBe(false);
    expect(keyManager.getKey("groq")).toBeNull();
  });

  test("Whitespace trimming in keys", () => {
    mockEnvVars({
      GROQ_API_KEYS: " gsk-key1 , gsk-key2 , gsk-key3 ",
    });

    keyManager.resetPool("groq");
    expect(keyManager.isConfigured("groq")).toBe(true);

    const key1 = keyManager.getKey("groq");
    expect(key1).toBe("gsk-key1"); // Should be trimmed
  });

  test("Empty and null keys are filtered out", () => {
    mockEnvVars({
      GEMINI_API_KEYS: "AIza-key1,,AIza-key2, ,AIza-key3",
    });

    keyManager.resetPool("gemini");
    expect(keyManager.isConfigured("gemini")).toBe(true);

    const keys = new Set();
    for (let i = 0; i < 10; i++) {
      const key = keyManager.getKey("gemini");
      if (key) keys.add(key);
    }

    expect(keys.size).toBe(3);
    expect(keys.has("AIza-key1")).toBe(true);
    expect(keys.has("AIza-key2")).toBe(true);
    expect(keys.has("AIza-key3")).toBe(true);
  });

  test("Round-robin distribution across keys", () => {
    mockEnvVars({
      OPENAI_API_KEYS: "sk-proj-key1,sk-proj-key2,sk-proj-key3,sk-proj-key4",
    });

    keyManager.resetPool("openai");

    const keyCounts: Record<string, number> = {
      "sk-proj-key1": 0,
      "sk-proj-key2": 0,
      "sk-proj-key3": 0,
      "sk-proj-key4": 0,
    };

    // Make 40 requests
    for (let i = 0; i < 40; i++) {
      const key = keyManager.getKey("openai");
      if (key) keyCounts[key]++;
    }

    // Each key should be used approximately 10 times
    Object.values(keyCounts).forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(9);
      expect(count).toBeLessThanOrEqual(11);
    });
  });
});

console.log("✅ Multi-Key Rotation System Tests Defined");
console.log("\nTo run these tests:");
console.log("  npx tsx tests/key-rotation.test.ts\n");
console.log("Configuration Guide:");
console.log("  - Use API_KEY for single key: GROQ_API_KEY=gsk_...");
console.log("  - Use API_KEYS for multiple keys: GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3");
console.log("  - Keys can be comma-separated or newline-separated");
console.log("  - System automatically rotates, tracks errors, and applies cooldowns");
