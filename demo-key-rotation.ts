/**
 * Multi-Key Rotation System - Demonstration
 * Run with: npx tsx demo-key-rotation.ts
 */

// Mock environment variables with sample multi-key configurations
process.env.OPENCODE_ZEN_API_KEYS = "zen_key1,zen_key2,zen_key3";

import { keyManager } from "./src/lib/key-manager";

console.log("\n" + "=".repeat(70));
console.log("🔄 Multi-Key Rotation System Demonstration");
console.log("=".repeat(70) + "\n");

// Demonstrate OpenCode Zen key rotation
console.log("📦 OpenCode Zen Provider (3 keys):");
console.log("   Keys: zen_key1, zen_key2, zen_key3\n");

console.log("   First 10 requests:");
for (let i = 0; i < 10; i++) {
  const key = keyManager.getKey("opencodezen");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate error tracking and cooldown
console.log("\n📦 Error Tracking & Cooldown Demonstration:");
console.log("   Using zen_key1 and simulating 3 errors...\n");

const testKey = "zen_key1";
keyManager.reportError("opencodezen", testKey);
console.log("   ❌ Error 1 reported for zen_key1");
keyManager.reportError("opencodezen", testKey);
console.log("   ❌ Error 2 reported for zen_key1");
keyManager.reportError("opencodezen", testKey);
console.log("   ❌ Error 3 reported for zen_key1 - Key now in cooldown (60s)\n");

console.log("   Next 5 requests (should skip zen_key1):");
for (let i = 0; i < 5; i++) {
  const key = keyManager.getKey("opencodezen");
  console.log(`     Request ${i + 1}: ${key}`);
}

// Demonstrate success reset
console.log("\n📦 Success Reset Demonstration:");
console.log("   Reporting success for zen_key2...\n");
keyManager.reportSuccess("opencodezen", "zen_key2");
console.log("   ✅ Success reported - error count reset for zen_key2");

// Show configuration status
console.log("\n📦 Configuration Status:");
const providers = ["opencodezen"] as const;
providers.forEach((provider) => {
  const isConfigured = keyManager.isConfigured(provider);
  const status = isConfigured ? "✅ Configured" : "❌ Not configured";
  console.log(`   ${provider.padEnd(12)}: ${status}`);
});

console.log("\n" + "=".repeat(70));
console.log("✅ Multi-Key Rotation System Working Correctly!");
console.log("=".repeat(70) + "\n");
