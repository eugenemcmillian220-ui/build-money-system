"use server";

import { scalingEngine, ScalingMetrics } from "../scaling";

export async function syncScalingWithPulse(): Promise<ScalingMetrics> {
  return await scalingEngine.syncWithPulse();
}

export async function triggerScale(direction: "up" | "down"): Promise<ScalingMetrics> {
  return await scalingEngine.scale(direction);
}
