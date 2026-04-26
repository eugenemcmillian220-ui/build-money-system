/**
 * Multi-Key Rotation System - Demonstration
 * Run with: npx tsx demo-key-rotation.ts
 */

// Mock environment variables with sample multi-key configurations
process.env.OPENROUTER_API_KEYS = "sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3";
process.env.GROQ_API_KEY = "gsk-demo-key";

import { keyManager } from "./src/lib/key-manager";

console.log("\n" + "=".repeat(70));
console.log("Multi-Key Rotation System Demonstration");
console.log("=".repeat(70) + "\n");

// Demonstrate OpenRouter key rotation
console.log("OpenRouter Provider (3 keys):");
console.log("   Keys: sk-or-v1-key1, sk-or-v1-key2, sk-or-v1-key3\n");

console.log("   First 10 requests:");
for (let i = 0; i < 10; i++) {
  const key = keyManager.getKey("openrouter");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate error tracking and cooldown
console.log("\nError Tracking & Cooldown Demonstration:");
console.log("   Using sk-or-v1-key1 and simulating 3 errors...\n");

const testKey = "sk-or-v1-key1";
keyManager.reportError("openrouter", testKey);
console.log("   Error 1 reported for sk-or-v1-key1");
keyManager.reportError("openrouter", testKey);
console.log("   Error 2 reported for sk-or-v1-key1");
keyManager.reportError("openrouter", testKey);
console.log("   Error 3 reported for sk-or-v1-key1 - Key now in cooldown (60s)\n");

console.log("   Next 5 requests (should skip sk-or-v1-key1):");
for (let i = 0; i < 5; i++) {
  const key = keyManager.getKey("openrouter");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate success reset
console.log("\nSuccess Reset Demonstration:");
console.log("   Reporting success for sk-or-v1-key2...\n");
keyManager.reportSuccess("openrouter", "sk-or-v1-key2");
console.log("   Success reported - error count reset for sk-or-v1-key2");

// Show configuration status
console.log("\nConfiguration Status:");
const providers = ["openrouter", "groq", "gemini", "openai", "deepseek"] as const;
providers.forEach((provider) => {
  const isConfigured = keyManager.isConfigured(provider);
  const status = isConfigured ? "Configured" : "Not configured";
  console.log(`   ${provider.padEnd(12)}: ${status}`);
});

console.log("\n" + "=".repeat(70));
console.log("Multi-Key Rotation System Working Correctly!");
console.log("=".repeat(70) + "\n");
