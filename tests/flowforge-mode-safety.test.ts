import { normalizeFlowForgeMode, resolveFlowForgeTriggerType } from "../src/lib/flowforge/mode";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

function run() {
  assert(normalizeFlowForgeMode("ELITE") === "elite", "Elite mode normalized from mixed case");
  assert(normalizeFlowForgeMode(" universal ") === "universal", "Universal mode normalized with whitespace");
  assert(normalizeFlowForgeMode("NANO") === "nano", "Nano mode normalized from uppercase");
  assert(normalizeFlowForgeMode("unknown") === "universal", "Unknown mode safely falls back to universal");

  assert(resolveFlowForgeTriggerType("nano", "manual") === "nano-tap", "Nano mode always enforces nano-tap trigger");
  assert(resolveFlowForgeTriggerType("elite", "WEBHOOK") === "webhook", "Elite mode allows normalized webhook trigger");
  assert(resolveFlowForgeTriggerType("elite", "nano-tap") === "manual", "Elite mode rejects nano-tap and falls back to manual");
  assert(resolveFlowForgeTriggerType("universal", "event") === "event", "Universal mode accepts standard event trigger");
  assert(resolveFlowForgeTriggerType("universal", "bad-trigger") === "manual", "Universal mode rejects invalid trigger and falls back to manual");
}

run();
