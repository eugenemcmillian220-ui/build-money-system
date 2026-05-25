import type { ExpansionPhaseDescriptor } from './types.js'

export const EXPANSION_PHASE_CATALOG: ExpansionPhaseDescriptor[] = [
  { index: 0, key: 'phase-01-core', displayName: 'Phase 01 — Core Generation', band: 'foundation', objective: 'Convert raw spec into normalized product requirements.', dependencies: [], riskLevel: 'low' },
  { index: 8, key: 'phase-09-expansion-e2e', displayName: 'Phase 09 — Expansion + E2E', band: 'build', objective: 'Pressure-test generated assets with release-like validation.', dependencies: [0], riskLevel: 'medium' },
  { index: 9, key: 'phase-10-economy-engine', displayName: 'Phase 10 — Economy Engine', band: 'economy', objective: 'Align credits, billing, and ledger semantics.', dependencies: [8], riskLevel: 'high' },
  { index: 15, key: 'phase-16-federation-expansion', displayName: 'Phase 16 — Federation Expansion', band: 'federation', objective: 'Replicate sovereign workloads across federation members.', dependencies: [9], riskLevel: 'high' },
  { index: 21, key: 'phase-22-swarm-mesh', displayName: 'Phase 22 — Swarm Mesh', band: 'autonomy', objective: 'Apply fair scheduling across autonomous multi-agent lanes.', dependencies: [15], riskLevel: 'high' },
]
