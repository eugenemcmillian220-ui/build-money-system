import type { TriggerType } from "./types";

export const FLOWFORGE_MODES = ["elite", "universal", "nano"] as const;
export const STANDARD_TRIGGER_TYPES: TriggerType[] = ["manual", "schedule", "webhook", "event"];

export type FlowForgeMode = (typeof FLOWFORGE_MODES)[number];

export function normalizeFlowForgeMode(value: unknown): FlowForgeMode {
  if (typeof value !== "string") return "universal";
  const normalized = value.trim().toLowerCase();
  return FLOWFORGE_MODES.includes(normalized as FlowForgeMode)
    ? (normalized as FlowForgeMode)
    : "universal";
}

export function isNanoTriggerRequired(mode: FlowForgeMode): boolean {
  return mode === "nano";
}

export function resolveFlowForgeTriggerType(mode: FlowForgeMode, triggerType: unknown): TriggerType {
  if (isNanoTriggerRequired(mode)) {
    return "nano-tap";
  }

  if (typeof triggerType !== "string") {
    return "manual";
  }

  const normalized = triggerType.trim().toLowerCase() as TriggerType;
  return STANDARD_TRIGGER_TYPES.includes(normalized) ? normalized : "manual";
}
