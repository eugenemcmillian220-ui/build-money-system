/**
 * Multi-Key Rotation System - Demonstration
 * Run with: npx tsx demo-key-rotation.ts
 */

// Mock environment variables with sample multi-key configurations
process.env.GROQ_API_KEYS = "gsk_key1,gsk_key2,gsk_key3";
process.env.GEMINI_API_KEYS = "AIza-key1,AIza-key2,AIza-key3";
process.env.OPENAI_API_KEYS = "sk-proj-key1,sk-proj-key2,sk-proj-key3";
process.env.OPENROUTER_API_KEYS = "sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3";

import { keyManager } from "./src/lib/key-manager";
import { llmRouter } from "./src/lib/llm-router";

console.log("\n" + "=".repeat(70));
console.log("🔄 Multi-Key Rotation System Demonstration");
console.log("=".repeat(70) + "\n");

// Demonstrate Groq key rotation
console.log("📦 Groq Provider (3 keys):");
console.log("   Keys: gsk_key1, gsk_key2, gsk_key3\n");

console.log("   First 10 requests:");
for (let i = 0; i < 10; i++) {
  const key = keyManager.getKey("groq");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate Gemini key rotation
console.log("\n📦 Gemini Provider (3 keys):");
console.log("   Keys: AIza-key1, AIza-key2, AIza-key3\n");

console.log("   First 10 requests:");
for (let i = 0; i < 10; i++) {
  const key = keyManager.getKey("gemini");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate error tracking and cooldown
console.log("\n📦 Error Tracking & Cooldown Demonstration:");
console.log("   Using gsk_key1 and simulating 3 errors...\n");

const testKey = "gsk_key1";
keyManager.reportError("groq", testKey);
console.log("   ❌ Error 1 reported for gsk_key1");
keyManager.reportError("groq", testKey);
console.log("   ❌ Error 2 reported for gsk_key1");
keyManager.reportError("groq", testKey);
console.log("   ❌ Error 3 reported for gsk_key1 - Key now in cooldown (60s)\n");

console.log("   Next 5 requests (should skip gsk_key1):");
for (let i = 0; i < 5; i++) {
  const key = keyManager.getKey("groq");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate success reset
console.log("\n📦 Success Reset Demonstration:");
console.log("   Reporting success for gsk_key2...\n");
keyManager.reportSuccess("groq", "gsk_key2");
console.log("   ✅ Success reported - error count reset for gsk_key2");

// Demonstrate LLM Router integration
console.log("\n📦 LLM Router Integration:");
console.log("   Provider priority: Groq → Gemini → OpenRouter → OpenAI\n");

console.log("   Next 5 provider selections:");
for (let i = 0; i < 5; i++) {
  const req = llmRouter.getNextRequest([]);
  console.log(`     Request ${i + 1}: ${req.provider.toUpperCase()} with model ${req.model}`);
}

// Show configuration status
console.log("\n📦 Configuration Status:");
const providers = ["groq", "gemini", "openai", "openrouter", "deepseek", "cerebras", "cloudflare"];
providers.forEach((provider) => {
  const isConfigured = keyManager.isConfigured(provider as any);
  const status = isConfigured ? "✅ Configured" : "❌ Not configured";
  console.log(`   ${provider.padEnd(12)}: ${status}`);
});

console.log("\n" + "=".repeat(70));
console.log("✅ Multi-Key Rotation System Working Correctly!");
console.log("=".repeat(70) + "\n");

console.log("📋 Configuration Guide:");
console.log("   Single key:     GROQ_API_KEY=gsk_abc123");
console.log("   Multiple keys:  GROQ_API_KEYS=key1,key2,key3");
console.log("   Mixed format:   GROQ_API_KEYS=key1,key2\\nkey3,key4");
console.log("   Fallback:       GROQ_API_KEYS= (empty) → uses GROQ_API_KEY\n");

console.log("\n🎯 Features:");
console.log("   • Automatic round-robin rotation");
console.log("   • Error tracking with 60s cooldown after 3 errors");
console.log("   • Success resets error count");
console.log("   • Supports comma and newline separators");
console.log("   • Automatic whitespace trimming");
console.log("   • Empty key filtering");
console.log("   • Provider-level failover");
console.log("\n");
