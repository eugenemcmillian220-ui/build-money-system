/**
 * Multi-Key Rotation System Test - OpenCode Zen Edition
 * Tests the key-manager's rotation, error tracking, and cooldown functionality
 */

import { keyManager } from "../src/lib/key-manager";

// Mock environment variables for testing
function mockEnvVars(keys: Record<string, string>): void {
  Object.assign(process.env, keys);
}

function clearMockEnvVars(): void {
  const keysToClear = [
    "OPENCODE_ZEN_API_KEY",
    "OPENCODE_ZEN_API_KEYS",
  ];
  keysToClear.forEach((key) => delete process.env[key]);
}

describe("Multi-Key Rotation System", () => {
  beforeEach(() => {
    clearMockEnvVars();
    keyManager.resetPool("opencodezen");
  });

  afterEach(() => {
    clearMockEnvVars();
  });

  test("Single key configuration", () => {
    mockEnvVars({
      OPENCODE_ZEN_API_KEY: "zen-single-key-12345",
    });

    keyManager.resetPool("opencodezen");
    expect(keyManager.isConfigured("opencodezen")).toBe(true);
    expect(keyManager.getKey("opencodezen")).toBe("zen-single-key-12345");
  });

  test("Multiple keys configuration (comma-separated)", () => {
    mockEnvVars({
      OPENCODE_ZEN_API_KEYS: "zen-key1,zen-key2,zen-key3",
    });

    keyManager.resetPool("opencodezen");
    expect(keyManager.isConfigured("opencodezen")).toBe(true);

    const key1 = keyManager.getKey("opencodezen");
    const key2 = keyManager.getKey("opencodezen");
    const key3 = keyManager.getKey("opencodezen");
    const key4 = keyManager.getKey("opencodezen"); // Should cycle back

    expect([key1, key2, key3]).toContain("zen-key1");
    expect([key1, key2, key3]).toContain("zen-key2");
    expect([key1, key2, key3]).toContain("zen-key3");
    expect(key4).toBe(key1); // Round-robin cycle
  });

  test("Error tracking and cooldown", () => {
    mockEnvVars({
      OPENCODE_ZEN_API_KEYS: "zen-key1,zen-key2,zen-key3",
    });

    keyManager.resetPool("opencodezen");

    const key1 = keyManager.getKey("opencodezen")!;
    
    // Report errors for key1 (should trigger cooldown after 3 errors)
    keyManager.reportError("opencodezen", key1);
    keyManager.reportError("opencodezen", key1);
    keyManager.reportError("opencodezen", key1);

    // Key1 should now be in cooldown
    const nextKey = keyManager.getKey("opencodezen");
    expect(nextKey).not.toBe(key1);
  });

  test("Success resets error count", () => {
    mockEnvVars({
      OPENCODE_ZEN_API_KEYS: "zen-key1,zen-key2",
    });

    keyManager.resetPool("opencodezen");

    const key1 = keyManager.getKey("opencodezen")!;
    
    keyManager.reportError("opencodezen", key1);
    keyManager.reportSuccess("opencodezen", key1);

    // Error count should be reset, key should still be usable
    const nextKey = keyManager.getKey("opencodezen");
    expect(nextKey).toBe(key1);
  });
});
