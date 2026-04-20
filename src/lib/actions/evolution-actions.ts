"use server";

import { getErrorClusters } from "./pulse-actions";
import { evolutionEngine, EvolutionPatch } from "../self-evolution";

export async function analyzeAndProposeEvolution(): Promise<EvolutionPatch[]> {
  // In a real implementation, we would call evolutionEngine.analyzeAndPropose()
  // but we need to pass it the critical clusters from Pulse
  const clusters = await getErrorClusters("00000000-0000-0000-0000-000000000000");
  const criticalClusters = clusters.filter(c => c.occurrenceCount > 10);

  const proposals: EvolutionPatch[] = [];

  // Propose bugfixes for critical clusters
  criticalClusters.forEach(cluster => {
    proposals.push({
      id: `patch-${Math.random().toString(36).substring(7)}`,
      target: cluster.errorType,
      type: "bugfix",
      description: `Automated patch for: ${cluster.errorMessage}`,
      impactScore: cluster.impactScore,
      status: "pending",
    });
  });

  // Propose optimizations
  proposals.push({
    id: "opt-001",
    target: "manifest_engine",
    type: "optimization",
    description: "Optimize manifest synthesis latency by caching frequent templates.",
    impactScore: 0.85,
    status: "pending",
  });

  return proposals;
}

export async function triggerEvolutionCycle(): Promise<{ success: boolean; patchesApplied: number }> {
  return await evolutionEngine.triggerCycle();
}

export async function getEvolutionHistory() {
  return await evolutionEngine.getHistory();
}
