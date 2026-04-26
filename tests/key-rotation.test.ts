/**
 * Multi-Key Rotation System Test
 * Tests the key-manager's rotation, error tracking, and cooldown functionality
 */

import { keyManager } from "../src/lib/key-manager";

// Mock environment variables for testing
function mockEnvVars(keys: Record<string, string>): void {
  Object.assign(process.env, keys);
}

function clearMockEnvVars(): void {
  const keysToClear = [
    "OPENROUTER_API_KEY",
    "OPENROUTER_API_KEYS",
    "GROQ_API_KEY",
    "GROQ_API_KEYS",
    "GEMINI_API_KEY",
    "GEMINI_API_KEYS",
    "OPENAI_API_KEY",
    "OPENAI_API_KEYS",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_API_KEYS",
  ];
  keysToClear.forEach((key) => delete process.env[key]);
}

describe("Multi-Key Rotation System", () => {
  beforeEach(() => {
    clearMockEnvVars();
    keyManager.resetPool("openrouter");
    keyManager.resetPool("groq");
    keyManager.resetPool("gemini");
    keyManager.resetPool("openai");
    keyManager.resetPool("deepseek");
  });

  afterEach(() => {
    clearMockEnvVars();
  });

  test("Single key configuration", () => {
    mockEnvVars({
      OPENROUTER_API_KEY: "sk-or-v1-single-key-12345",
    });

    keyManager.resetPool("openrouter");
    expect(keyManager.isConfigured("openrouter")).toBe(true);
    expect(keyManager.getKey("openrouter")).toBe("sk-or-v1-single-key-12345");
  });

  test("Multiple keys configuration (comma-separated)", () => {
    mockEnvVars({
      OPENROUTER_API_KEYS: "sk-or-key1,sk-or-key2,sk-or-key3",
    });

    keyManager.resetPool("openrouter");
    expect(keyManager.isConfigured("openrouter")).toBe(true);

    const key1 = keyManager.getKey("openrouter");
    const key2 = keyManager.getKey("openrouter");
    const key3 = keyManager.getKey("openrouter");
    const key4 = keyManager.getKey("openrouter"); // Should cycle back

    expect([key1, key2, key3]).toContain("sk-or-key1");
    expect([key1, key2, key3]).toContain("sk-or-key2");
    expect([key1, key2, key3]).toContain("sk-or-key3");
    expect(key4).toBe(key1); // Round-robin cycle
  });

  test("Error tracking and cooldown", () => {
    mockEnvVars({
      OPENROUTER_API_KEYS: "sk-or-key1,sk-or-key2,sk-or-key3",
    });

    keyManager.resetPool("openrouter");

    const key1 = keyManager.getKey("openrouter")!;
    
    // Report errors for key1 (should trigger cooldown after 3 errors)
    keyManager.reportError("openrouter", key1);
    keyManager.reportError("openrouter", key1);
    keyManager.reportError("openrouter", key1);

    // Key1 should now be in cooldown
    const nextKey = keyManager.getKey("openrouter");
    expect(nextKey).not.toBe(key1);
  });

  test("Success resets error count", () => {
    mockEnvVars({
      OPENROUTER_API_KEYS: "sk-or-key1,sk-or-key2",
    });

    keyManager.resetPool("openrouter");

    const key1 = keyManager.getKey("openrouter")!;
    
    keyManager.reportError("openrouter", key1);
    keyManager.reportSuccess("openrouter", key1);

    // Error count should be reset, key should still be usable
    const nextKey = keyManager.getKey("openrouter");
    expect(nextKey).toBe(key1);
  });

  test("isAnyConfigured returns true when at least one provider has keys", () => {
    mockEnvVars({
      GROQ_API_KEY: "gsk-test-key",
    });

    keyManager.resetPool("groq");
    expect(keyManager.isAnyConfigured()).toBe(true);
    expect(keyManager.getFirstConfiguredProvider()).toBe("groq");
  });

  test("isAnyConfigured returns false when no providers configured", () => {
    expect(keyManager.isAnyConfigured()).toBe(false);
    expect(keyManager.getFirstConfiguredProvider()).toBeNull();
  });
});
