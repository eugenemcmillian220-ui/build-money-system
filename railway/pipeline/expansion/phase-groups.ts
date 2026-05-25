import { EXPANSION_PHASE_CATALOG } from './phase-catalog.js'
import type { ExpansionPhaseBand, ExpansionPhaseDescriptor } from './types.js'

export function getExpansionBand(phaseIndex: number): ExpansionPhaseBand {
  const match = EXPANSION_PHASE_CATALOG.find((phase) => phase.index === phaseIndex)
  return match?.band ?? 'build'
}

export function getExpansionDescriptor(phaseIndex: number): ExpansionPhaseDescriptor | undefined {
  return EXPANSION_PHASE_CATALOG.find((phase) => phase.index === phaseIndex)
}
